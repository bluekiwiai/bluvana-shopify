# Bluvana Shopify product automation

The `Bluvana Product Automation` custom app is installed on the Bluvana store.
Its client secret is stored in macOS Keychain under the service
`codex-shopify-bluvana-client-secret`; no secret is committed to this project.

## Commands

```bash
npm run shopify:product -- verify
npm run shopify:product -- locations
npm run shopify:product -- create shopify/products/example.product.json --dry-run
npm run shopify:product -- create shopify/products/my-product.json
```

New products default to `DRAFT`. Set `"status": "ACTIVE"` and
`"publish": true` only when the product should be visible on the Online Store.

## Product file

See `products/example.product.json` for the accepted structure. It supports:

- title, HTML description, vendor, type, category, tags, SEO, handle, and status
- remote image URLs and local JPG, PNG, WEBP, GIF, or AVIF files
- Color, Size, or any other Shopify product options
- variant prices, compare-at prices, SKUs, barcodes, taxability, and image mapping
- tracked inventory at the store's default fulfillment location
- optional publication to the Online Store

`imageIndex` is zero-based and refers to the matching entry in `images`.
