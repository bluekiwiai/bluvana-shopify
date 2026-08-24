# Contributing to Bluvana Shopify

This is a public repository. Anyone with a GitHub account may contribute code, images, documents, or other relevant files through a pull request.

GitHub does not permit unrestricted direct uploads to another user's repository. Contributors upload to their own fork, then request that the changes be merged here.

## Upload files in the GitHub website

1. Open `https://github.com/bluekiwiai/bluvana-shopify` and select **Fork**.
2. In your fork, open the appropriate destination folder.
3. Select **Add file → Upload files**.
4. Add a short description and commit the upload to a new branch.
5. Select **Contribute → Open pull request**.
6. Explain what the files are, where they came from, and how Bluvana may use them.

## Contribute with Git

```sh
gh repo fork bluekiwiai/bluvana-shopify --clone
cd bluvana-shopify
git switch -c your-name/short-description
# Add or edit files.
git add .
git commit -m "Describe the contribution"
git push -u origin HEAD
gh pr create --fill
```

## Placement

- Shopify theme work belongs in the matching theme directory.
- Product-image generation prompts and pose-transfer material belong under `creative/product-image-generation/`.
- Product specifications belong under `shopify/products/`.
- Brand files belong under the relevant `public/bluvana-*` directory.
- If the correct location is unclear, describe the material in the pull request and leave a note for the maintainers.

## Before submitting

- Do not upload credentials, tokens, customer or order data, private app secrets, `.env` files, or material you do not have permission to share.
- Remember that every merged file becomes publicly accessible.
- Run `npm run check` when changing either Shopify theme.
- Do not publish a live Shopify theme or activate a product as part of a contribution.
