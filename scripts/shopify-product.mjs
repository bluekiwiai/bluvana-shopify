#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHOP = "em3i5y-qa.myshopify.com";
const API_VERSION = "2026-07";
const CLIENT_ID = "43202c0b62c0916b9ff9e9a162e5bcce";
const KEYCHAIN_SERVICE = "codex-shopify-bluvana-client-secret";
const GRAPHQL_URL = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

const MIME_TYPES = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function fail(message) {
  throw new Error(message);
}

function getClientSecret() {
  try {
    return execFileSync(
      "/usr/bin/security",
      [
        "find-generic-password",
        "-a",
        CLIENT_ID,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    fail(
      `Shopify credential not found in macOS Keychain (service: ${KEYCHAIN_SERVICE}).`,
    );
  }
}

async function getAccessToken() {
  const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: getClientSecret(),
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    fail(`Shopify authentication failed (${response.status}).`);
  }
  return payload.access_token;
}

async function graphql(token, query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok) {
    fail(`Shopify API request failed (${response.status}).`);
  }
  if (payload.errors?.length) {
    fail(payload.errors.map((error) => error.message).join("\n"));
  }
  return payload.data;
}

function assertUserErrors(userErrors, operation) {
  if (!userErrors?.length) return;
  const detail = userErrors
    .map((error) => {
      const field = error.field?.length ? ` (${error.field.join(".")})` : "";
      return `${error.message}${field}`;
    })
    .join("\n");
  fail(`${operation} failed:\n${detail}`);
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeImage(image, index, title, specDirectory) {
  const source = typeof image === "string" ? image : image.src ?? image.path ?? image.url;
  if (!source) fail(`Image ${index + 1} is missing src/path/url.`);

  return {
    alt: typeof image === "string" ? title : image.alt ?? title,
    filename:
      typeof image === "string"
        ? basename(source.split("?")[0])
        : image.filename ?? basename(source.split("?")[0]),
    localPath: isRemoteUrl(source) ? null : resolve(specDirectory, source),
    source: isRemoteUrl(source) ? source : null,
  };
}

async function stageLocalImage(token, image) {
  const extension = extname(image.localPath).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    fail(`Unsupported image type for ${image.localPath}. Use JPG, PNG, WEBP, GIF, or AVIF.`);
  }

  const fileInfo = await stat(image.localPath);
  const data = await graphql(
    token,
    `mutation StageImage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          resource: "IMAGE",
          filename: image.filename,
          mimeType,
          httpMethod: "POST",
          fileSize: String(fileInfo.size),
        },
      ],
    },
  );

  assertUserErrors(data.stagedUploadsCreate.userErrors, "Image staging");
  const target = data.stagedUploadsCreate.stagedTargets?.[0];
  if (!target) fail(`Shopify did not return an upload target for ${image.localPath}.`);

  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  const bytes = await readFile(image.localPath);
  form.append("file", new Blob([bytes], { type: mimeType }), image.filename);

  const upload = await fetch(target.url, { method: "POST", body: form });
  if (!upload.ok) {
    fail(`Image upload failed for ${image.localPath} (${upload.status}).`);
  }

  return { ...image, source: target.resourceUrl };
}

async function prepareImages(token, images, title, specDirectory) {
  const normalized = (images ?? []).map((image, index) =>
    normalizeImage(image, index, title, specDirectory),
  );

  const prepared = [];
  for (const image of normalized) {
    prepared.push(image.localPath ? await stageLocalImage(token, image) : image);
  }
  return prepared;
}

function deriveOptions(spec) {
  if (spec.options?.length) {
    return spec.options.map((option, index) => ({
      name: option.name,
      position: option.position ?? index + 1,
      values: option.values.map((value) => ({
        name: typeof value === "string" ? value : value.name,
      })),
    }));
  }

  const optionNames = [];
  const valuesByName = new Map();
  for (const variant of spec.variants ?? []) {
    for (const [name, value] of Object.entries(variant.options ?? {})) {
      if (!valuesByName.has(name)) {
        optionNames.push(name);
        valuesByName.set(name, []);
      }
      if (!valuesByName.get(name).includes(value)) valuesByName.get(name).push(value);
    }
  }

  if (!optionNames.length) {
    return [{ name: "Title", position: 1, values: [{ name: "Default Title" }] }];
  }

  return optionNames.map((name, index) => ({
    name,
    position: index + 1,
    values: valuesByName.get(name).map((value) => ({ name: value })),
  }));
}

async function getDefaultLocationId(token) {
  const data = await graphql(
    token,
    `query DefaultLocation {
      locations(first: 10, includeInactive: false) {
        nodes { id name fulfillsOnlineOrders }
      }
    }`,
  );
  const locations = data.locations.nodes;
  const selected = locations.find((location) => location.fulfillsOnlineOrders) ?? locations[0];
  if (!selected) fail("No active Shopify location is available for inventory.");
  return selected.id;
}

function normalizeVariant(variant, index, options, images, locationId) {
  const optionValues = options.map((option) => {
    const value = variant.options?.[option.name];
    if (value == null) {
      if (option.name === "Title" && options.length === 1) {
        return { optionName: "Title", name: "Default Title" };
      }
      fail(`Variant ${index + 1} is missing option ${option.name}.`);
    }
    return { optionName: option.name, name: String(value) };
  });

  const inventoryItem = {
    ...(variant.cost != null ? { cost: String(variant.cost) } : {}),
    ...(variant.tracked != null ? { tracked: Boolean(variant.tracked) } : {}),
    ...(variant.requiresShipping != null
      ? { requiresShipping: Boolean(variant.requiresShipping) }
      : {}),
  };

  const imageIndex = variant.imageIndex;
  const image = imageIndex == null ? null : images[imageIndex];
  if (imageIndex != null && !image) {
    fail(`Variant ${index + 1} references missing imageIndex ${imageIndex}.`);
  }

  return {
    optionValues,
    ...(variant.price != null ? { price: String(variant.price) } : {}),
    ...(variant.compareAtPrice != null
      ? { compareAtPrice: String(variant.compareAtPrice) }
      : {}),
    ...(variant.sku ? { sku: variant.sku } : {}),
    ...(variant.barcode ? { barcode: variant.barcode } : {}),
    ...(variant.inventoryPolicy
      ? { inventoryPolicy: variant.inventoryPolicy.toUpperCase() }
      : {}),
    ...(variant.taxable != null ? { taxable: Boolean(variant.taxable) } : {}),
    ...(Object.keys(inventoryItem).length ? { inventoryItem } : {}),
    ...(variant.inventory != null
      ? {
          inventoryQuantities: [
            {
              locationId: variant.locationId ?? locationId,
              name: "available",
              quantity: Number(variant.inventory),
            },
          ],
        }
      : {}),
    ...(image
      ? {
          file: {
            originalSource: image.source,
            contentType: "IMAGE",
            filename: image.filename,
            alt: image.alt,
          },
        }
      : {}),
  };
}

function buildProductInput(spec, options, variants, images) {
  return {
    title: spec.title,
    descriptionHtml: spec.descriptionHtml ?? spec.description ?? "",
    status: (spec.status ?? "DRAFT").toUpperCase(),
    vendor: spec.vendor ?? "Bluvana",
    ...(spec.handle ? { handle: spec.handle } : {}),
    ...(spec.productType ? { productType: spec.productType } : {}),
    ...(spec.category ? { category: spec.category } : {}),
    ...(spec.tags ? { tags: spec.tags } : {}),
    ...(spec.seo ? { seo: spec.seo } : {}),
    productOptions: options,
    variants,
    files: images.map((image) => ({
      originalSource: image.source,
      contentType: "IMAGE",
      filename: image.filename,
      alt: image.alt,
    })),
  };
}

async function publishProduct(token, productId, publicationName = "Online Store") {
  const publications = await graphql(
    token,
    `query Publications {
      publications(first: 50) { nodes { id name } }
    }`,
  );
  const publication = publications.publications.nodes.find(
    (candidate) => candidate.name.toLowerCase() === publicationName.toLowerCase(),
  );
  if (!publication) {
    fail(`Shopify publication not found: ${publicationName}`);
  }

  const result = await graphql(
    token,
    `mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable { availablePublicationsCount { count } }
        userErrors { field message }
      }
    }`,
    { id: productId, input: [{ publicationId: publication.id }] },
  );
  assertUserErrors(result.publishablePublish.userErrors, "Product publishing");
}

async function createProduct(specPath, dryRun) {
  const absoluteSpecPath = resolve(specPath);
  const spec = JSON.parse(await readFile(absoluteSpecPath, "utf8"));
  if (!spec.title?.trim()) fail("Product title is required.");

  const token = await getAccessToken();
  const images = dryRun
    ? (spec.images ?? []).map((image, index) =>
        normalizeImage(image, index, spec.title, dirname(absoluteSpecPath)),
      )
    : await prepareImages(token, spec.images, spec.title, dirname(absoluteSpecPath));
  const options = deriveOptions(spec);
  const rawVariants = spec.variants?.length
    ? spec.variants
    : [
        {
          options: { Title: "Default Title" },
          price: spec.price,
          sku: spec.sku,
          inventory: spec.inventory,
          tracked: spec.tracked,
          requiresShipping: spec.requiresShipping,
        },
      ];
  const needsLocation = rawVariants.some((variant) => variant.inventory != null);
  const locationId = needsLocation
    ? spec.locationId ?? (dryRun ? "gid://shopify/Location/DRY_RUN" : await getDefaultLocationId(token))
    : null;

  const variants = rawVariants.map((variant, index) =>
    normalizeVariant(variant, index, options, images, locationId),
  );
  const input = buildProductInput(spec, options, variants, images);

  if (dryRun) {
    console.log(JSON.stringify({ input, publish: spec.publish ?? false }, null, 2));
    return;
  }

  const result = await graphql(
    token,
    `mutation CreateProduct($input: ProductSetInput!) {
      productSet(input: $input, synchronous: true) {
        product {
          id
          title
          handle
          status
          onlineStoreUrl
          options { name values }
          variants(first: 100) {
            nodes { id title sku price compareAtPrice selectedOptions { name value } }
          }
          media(first: 100) {
            nodes { id alt mediaContentType status }
          }
        }
        userErrors { field message code }
      }
    }`,
    { input },
  );
  assertUserErrors(result.productSet.userErrors, "Product creation");
  const product = result.productSet.product;
  if (!product) fail("Shopify did not return the created product.");

  if (spec.publish) {
    await publishProduct(token, product.id, spec.publication ?? "Online Store");
  }

  console.log(
    JSON.stringify(
      {
        id: product.id,
        title: product.title,
        handle: product.handle,
        status: product.status,
        published: Boolean(spec.publish),
        adminUrl: `https://admin.shopify.com/store/em3i5y-qa/products/${product.id.split("/").at(-1)}`,
        onlineStoreUrl: product.onlineStoreUrl,
        variantCount: product.variants.nodes.length,
        mediaCount: product.media.nodes.length,
      },
      null,
      2,
    ),
  );
}

async function verify() {
  const token = await getAccessToken();
  const data = await graphql(
    token,
    `query VerifyShopifyConnection {
      shop { name myshopifyDomain }
      products(first: 1) { nodes { id title } }
    }`,
  );
  console.log(
    JSON.stringify(
      {
        connected: true,
        shop: data.shop,
        sampleProduct: data.products.nodes[0] ?? null,
      },
      null,
      2,
    ),
  );
}

async function locations() {
  const token = await getAccessToken();
  const data = await graphql(
    token,
    `query Locations {
      locations(first: 50, includeInactive: true) {
        nodes { id name isActive fulfillsOnlineOrders }
      }
    }`,
  );
  console.log(JSON.stringify(data.locations.nodes, null, 2));
}

function usage() {
  const script = basename(fileURLToPath(import.meta.url));
  console.log(`Usage:
  node scripts/${script} verify
  node scripts/${script} locations
  node scripts/${script} create <product.json> [--dry-run]`);
}

const [command, specPath, ...flags] = process.argv.slice(2);
try {
  if (command === "verify") await verify();
  else if (command === "locations") await locations();
  else if (command === "create" && specPath) {
    await createProduct(specPath, flags.includes("--dry-run"));
  } else {
    usage();
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
