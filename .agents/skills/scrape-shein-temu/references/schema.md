# Output schema

## Record fields

All fields are optional unless passed in `--required`.

| Field | Type | Meaning |
|---|---|---|
| `site` | string | `shein` or `temu` |
| `product_id` | string | Site product identifier from URL or markup |
| `title` | string | Product title |
| `price` | number | Current displayed numeric price |
| `original_price` | number | Crossed-out or original price |
| `currency` | string | ISO-style currency when known |
| `price_qualifier` | string | For example `after coupon` |
| `rating` | number | Displayed item rating |
| `review_count` | integer | Displayed item review count |
| `sold_count` | string | Preserve compact display, such as `31K+` |
| `availability` | string | Displayed stock state |
| `brand` | string | Brand or store label |
| `category` | string | Product category |
| `variants` | array | Visible variant labels or structured variants |
| `images` | array | Product image URLs |
| `shipping` | object | Visible shipping estimate and qualifiers |
| `url` | string | Canonical product URL |
| `source_mode` | string | `http`, `html_file`, `browser_dom`, or `computer_use` |
| `extraction_strategy` | string | Parser or UI method used |
| `retrieved_at` | string | UTC ISO-8601 timestamp |

## Envelope

The scraper emits:

```json
{
  "schema_version": 1,
  "status": "complete",
  "site": "shein",
  "operation": "search",
  "required_fields": ["title", "price", "url"],
  "records": [],
  "diagnostics": {
    "failure_class": null,
    "missing_fields": [],
    "block_reason": null,
    "evidence_dir": null
  }
}
```

`missing_fields` contains objects with `record_index`, `url`, and `fields`. A search result is complete only when at least one record exists and every retained record satisfies the required fields.

## Required-field guidance

- Product discovery: `title,price,url`
- Price comparison: `title,price,currency,url`
- Social proof: `title,rating,review_count,url`
- Detail page: name exactly what the user asked for; do not silently weaken the set.
