# Bluvana Shopify theme

Local source for Bluvana's **Horizon** storefront theme.

- Store: `em3i5y-qa.myshopify.com`
- Live theme: `Horizon` (`141773373502`)
- CLI environment: `bluvana`

## Safe development workflow

Run commands from this directory.

```sh
# Start a disposable development theme with live preview and hot reload
shopify theme dev --environment bluvana

# Check Liquid and theme files before uploading
shopify theme check

# Refresh this folder from the live theme (review local changes first)
shopify theme pull --environment bluvana --live
```

Do not push or publish the live theme unless that action is explicitly intended. For reviewable changes, use `theme dev` or push to a new unpublished theme.

