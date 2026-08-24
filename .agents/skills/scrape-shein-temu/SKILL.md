---
name: scrape-shein-temu
description: Retrieve, validate, and compare public product and listing data from SHEIN and Temu with a fast HTTP/HTML scraper, browser or Computer Use recovery, evidence capture, and parser self-repair. Use for SHEIN or Temu product searches, product URLs, prices, ratings, reviews, sold counts, variants, availability, images, shipping details, or recurring product monitoring where missing fields must trigger persistent fallback rather than an incomplete answer.
---

# Scrape SHEIN and Temu

Return validated structured data. Never treat a page that omits requested fields as success.

## Run the fast path

Use the bundled standard-library scraper first:

```bash
python3 scripts/scrape.py --site shein --query "linen dress" --required title,price,url --max-results 20
python3 scripts/scrape.py --url "https://www.temu.com/...-g-123.html" --required title,price,url
```

Resolve `scripts/` relative to this `SKILL.md`. Read [references/schema.md](references/schema.md) when choosing fields or consuming output.

The JSON `status` is authoritative:

- `complete`: every returned record contains every required field.
- `incomplete`: content loaded, but one or more requested fields are absent.
- `blocked`: challenge, login wall, consent wall, or risk control replaced the requested content.
- `error`: transport or parsing failed before useful content was obtained.

Do not summarize an `incomplete`, `blocked`, or `error` result as if it were complete.

## Recover persistently

On any non-complete result, read and follow [references/fallback-workflow.md](references/fallback-workflow.md). Use the Browser skill before standalone automation when available. Use Computer Use when the normal browser path cannot render the data or when a user-facing browser session is required.

Continue through the recovery ladder until one of these terminal conditions:

1. Every requested field is validated.
2. A CAPTCHA or authentication step requires the user. Ask at action time, preserve the tab for handoff, and resume after the user completes it.
3. The site does not expose the requested fact anywhere available to the user. Report that specific field as unavailable with the attempted sources.

Never bypass a CAPTCHA, access control, rate limit, paywall, or security warning. Do not read cookies, local storage, browser history, passwords, or session stores. Do not buy, add to cart, subscribe, or submit forms while retrieving product data.

## Validate fallback data

After UI recovery, place only the normalized records in a JSON file and validate them:

```bash
python3 scripts/scrape.py --validate-json /path/to/records.json --site temu --required title,price,url
```

Keep UI extraction narrowly scoped to product cards or the product detail container. Do not export full body text, account headers, delivery addresses, unrelated reviews, or other personal page state.

## Repair the fast path

If `diagnostics.failure_class` is `parser_miss` and the fallback proves the fields exist in source HTML:

1. Save the smallest sanitized HTML fragment containing one affected product.
2. Add it to `scripts/fixtures/` with no account, cookie, location, or session data.
3. Patch `scripts/scrape.py` to extract the missing fields.
4. Add an assertion to `scripts/test_scrape.py`.
5. Run `python3 scripts/test_scrape.py` and rerun the original fast-path command.

If the failure class is `access_blocked`, do not pretend a selector patch can recover HTML that was never returned. Improve block detection or UI extraction only when evidence warrants it. Preserve this distinction in the final answer.

## Report provenance

For each result, retain `source_mode`, `extraction_strategy`, `retrieved_at`, canonical `url`, and locale/currency when known. State whether HTTP extraction or UI recovery produced the answer. Prices are observations, not guarantees; preserve qualifiers such as `after coupon`, selected variant, region, and login state when visible.
