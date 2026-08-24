# Bluvana Shopify repository

## Purpose

- This is a shared, currently public workspace for Bluvana Shopify themes, product operations, brand assets, product data, and ecommerce research.
- It is not the course website and it is not a Shopify app repository.
- The target Shopify store is `em3i5y-qa.myshopify.com`.

## Repository map

- `bluvana-shopify-theme/`: main home and shower-filter Online Store 2.0 theme.
- `bluvana-silk-theme/`: silk product-line Online Store 2.0 theme.
- `shopify/products/`: JSON product specifications. New products default to draft.
- `scripts/shopify-product.mjs`: Shopify Admin API product automation.
- `public/bluvana-*`: brand system, logos, and visual references.
- `filter photos/`: shower-filter product imagery.
- `ad-analysis/`: competitive research and generated ad creative.
- `creative/product-image-generation/pose-transfers/`: reusable pose-only prompt sets for product-image generation.
- `.agents/skills/scrape-shein-temu/`: project-local Codex skill for validated SHEIN and Temu product research with browser recovery.
- Root Markdown, CSV, JPG, and JSON files: product research, source data, audits, and creative prompts.

## Working agreements

- Inspect the relevant files and explain material assumptions before changing business logic, product data, checkout behavior, or store-connected configuration.
- Preserve the existing visual system unless the user asks for a redesign.
- Keep changes focused. Do not reorganize large asset or theme trees unless explicitly requested.
- Never add secrets, access tokens, customer data, order exports, or private app credentials to Git.
- The custom app secret belongs in macOS Keychain under service `codex-shopify-bluvana-client-secret`.
- Treat product prices, claims, compare-at prices, inventory, publication status, and legal/policy copy as business-sensitive. Call out proposed changes clearly.

## Theme work

- Shopify storefront source uses Liquid, JSON templates, CSS, and JavaScript.
- Validate every edited theme with `shopify theme check` from that theme directory. Run `npm run check` when changes span both themes.
- Use `shopify theme dev --environment bluvana` for preview and hot reload.
- Preview through a development or unpublished theme.
- Never push to, publish, rename, or delete a live theme unless the user explicitly requests that exact live action.
- Before pulling a remote theme over local work, inspect Git status and the diff so local changes are not overwritten.
- Do not treat theme settings JSON as disposable; merchant-configured content may live there.

## Product automation

- Read `shopify/README.md` before using `scripts/shopify-product.mjs`.
- Start with a dry run and keep new products in `DRAFT` unless the user explicitly requests creation or activation.
- Creating a product, changing inventory, publishing to a sales channel, or modifying existing store data is an external write. State the intended target and effect before running it.
- Store generated API results only in `shopify/products/*.result.json`; those files are ignored by Git.

## Git and collaboration

- Start shared work from an up-to-date `main` branch and use a short task branch for non-trivial changes.
- Do not overwrite or discard another person's uncommitted work.
- Prefer a pull request for changes that affect checkout, product templates, pricing, product data, scripts, or both themes.
- Keep commits scoped and describe the user-visible or operational effect.

## Code Review Rules

- Flag any path that can publish a theme, activate a product, write inventory, or expose a secret without an explicit user decision and a safe preview or dry-run path.
- Flag product-template changes that break variant selection, add-to-cart behavior, prices, media, localization, accessibility, or mobile layouts.
- Flag hard-coded credentials, customer/order data, and generated result files intended to remain local.
- Flag edits to store-connected JSON or settings data that could silently overwrite merchant configuration.
- Flag claims, pricing, compare-at pricing, policy text, or availability messages that are changed without the request clearly supporting them.
