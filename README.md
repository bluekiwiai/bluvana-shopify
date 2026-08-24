# Bluvana Shopify workspace

Working repository for Bluvana's Shopify storefronts, product operations, brand assets, and ecommerce research. The repository is currently public, so commit only material suitable for public access.

## What's here

| Path | Purpose |
| --- | --- |
| `bluvana-shopify-theme/` | Main Bluvana home and shower-filter Shopify theme |
| `bluvana-silk-theme/` | Bluvana silk product-line Shopify theme |
| `shopify/` + `scripts/shopify-product.mjs` | Draft-product creation and Shopify Admin API utilities |
| `public/bluvana-*` | Brand system, logos, and visual references |
| `filter photos/` | Shower-filter product imagery |
| `ad-analysis/` | Competitive ad analysis and Bluvana creative work |
| `creative/product-image-generation/pose-transfers/` | Reusable pose-transfer prompt sets for product images |
| Root research files | Product data, sourcing, GMC audit, prompts, and product-page research |

The original course site, course videos, local caches, and generated archives are intentionally not part of this repository.

## Cofounder setup

### 1. Get access

Kyle needs to grant you both:

- collaborator access to `bluekiwiai/bluvana-shopify` if you need to push changes (the repository is public to read);
- Shopify staff or collaborator access to `em3i5y-qa.myshopify.com`, including Online Store themes, Products, Content/Files, and any app permissions needed for your work.

Accept both invitations before continuing.

### 2. Install the local tools

Install Git, the [GitHub CLI](https://cli.github.com/), a current Node.js LTS release, the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli), and the Codex desktop app.

```sh
gh auth login
npm install -g @shopify/cli@latest
```

### 3. Clone and open the repo in Codex

```sh
gh repo clone bluekiwiai/bluvana-shopify
cd bluvana-shopify
```

In Codex, choose **Open folder** and select the cloned `bluvana-shopify` folder. Start a new task in that folder. Codex automatically reads the repository's `AGENTS.md`, so you can describe the outcome you want in normal language without explaining the repository layout or safety rules each time.

To confirm the setup, ask:

> Summarize this repo, the active AGENTS.md instructions, and the safe Shopify workflow. Don't change anything.

### 4. Connect Shopify CLI

The first preview command will open Shopify authentication if needed:

```sh
npm run theme:dev:home
```

Use `Ctrl-C` to stop the preview. For the silk storefront instead, run:

```sh
npm run theme:dev:silk
```

The preview uses a development theme. It does not publish the live theme.

### 5. Optional: enable product automation

The product script authenticates with the installed `Bluvana Product Automation` custom app. The client secret is never stored in Git. Ask Kyle to share it through a password manager or another secure channel, then save it in macOS Keychain:

1. Open **Keychain Access**.
2. Create a new password item.
3. Set **Keychain Item Name** to `codex-shopify-bluvana-client-secret`.
4. Set **Account Name** to `43202c0b62c0916b9ff9e9a162e5bcce`.
5. Paste the app client secret as the password.

Verify the connection without changing store data:

```sh
npm run shopify:verify
```

See `shopify/README.md` before creating products. Product specs default to `DRAFT`; keep them that way unless publication is explicitly intended.

## Working naturally with Codex

Good prompts state the desired outcome and any important business constraint. Codex already has the repo map, checks, and publishing guardrails in `AGENTS.md`.

Examples:

- “Show me which files control the main Bluvana product page and explain how they fit together. Don't edit anything.”
- “In the silk theme, change the trust section copy to this text. Preserve the current design, run theme checks, and give me a preview command.”
- “Create a draft Shopify product spec from this product information. Validate it, but don't create or publish anything yet.”
- “Turn these six images into a new product-page section in the main theme. Make it mobile-friendly and preview-only.”
- “Review the current branch for anything that could affect checkout, product variants, or the live theme.”
- “Pull the latest GitHub changes, explain what changed, then help me continue the product-page work.”

For larger changes, ask Codex to create a branch and a pull request so the other cofounder can review before merging.

## Day-to-day Git workflow

```sh
git switch main
git pull --ff-only
git switch -c your-name/short-task
# Ask Codex to make and verify the change.
git push -u origin HEAD
gh pr create --fill
```

Do not commit secrets, access tokens, exported customer data, or local `.env` files. Do not publish a theme or activate a product unless that exact live action is explicitly requested.

## Checks

Run both theme checks:

```sh
npm run check
```

Or check one theme directly from its directory:

```sh
shopify theme check
```

Codex behavior in this repository is defined in `AGENTS.md`, following [OpenAI's official AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
