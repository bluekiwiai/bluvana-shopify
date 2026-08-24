#!/usr/bin/env python3
"""Dependency-free SHEIN/Temu public HTML extractor and validator."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import html as html_lib
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, quote_plus, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

SCHEMA_VERSION = 1
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
)
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
PRODUCT_PATTERNS = {
    "shein": re.compile(r"-p-(\d+)\.html", re.I),
    "temu": re.compile(r"-g-(\d+)\.html", re.I),
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = html_lib.unescape(str(value))
    text = re.sub(r"[\s\u200b-\u200f\ufeff]+", " ", text).strip()
    return text or None


def number(value: Any) -> float | None:
    if value is None:
        return None
    match = re.search(r"-?[\d,]+(?:\.\d+)?", str(value))
    return float(match.group(0).replace(",", "")) if match else None


def integer(value: Any) -> int | None:
    parsed = number(value)
    return int(parsed) if parsed is not None else None


def canonical_url(url: str | None, base: str | None = None) -> str | None:
    if not url:
        return None
    absolute = urljoin(base or "", html_lib.unescape(url))
    parts = urlparse(absolute)
    if not parts.scheme or not parts.netloc:
        return absolute
    return urlunparse((parts.scheme, parts.netloc.lower(), parts.path, "", "", ""))


def detect_site(url: str | None, hint: str | None = None) -> str | None:
    if hint in {"shein", "temu"}:
        return hint
    host = urlparse(url or "").netloc.lower()
    if "shein." in host:
        return "shein"
    if "temu." in host:
        return "temu"
    return None


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    parent: "Node | None" = None
    children: list[Any] = field(default_factory=list)

    def text(self) -> str:
        chunks: list[str] = []

        def visit(item: Any) -> None:
            if isinstance(item, str):
                chunks.append(item)
            elif isinstance(item, Node) and item.tag not in {"script", "style"}:
                for child in item.children:
                    visit(child)

        visit(self)
        return clean_text(" ".join(chunks)) or ""

    def walk(self) -> Iterable["Node"]:
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()


class TreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {k.lower(): v or "" for k, v in attrs}, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag.lower() not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in VOID_TAGS:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


def parse_html(source: str) -> Node:
    parser = TreeParser()
    parser.feed(source)
    parser.close()
    return parser.root


def meta_map(root: Node) -> dict[str, str]:
    result: dict[str, str] = {}
    for node in root.walk():
        if node.tag != "meta" or not node.attrs.get("content"):
            continue
        key = (node.attrs.get("property") or node.attrs.get("name") or "").lower()
        if key and key not in result:
            result[key] = node.attrs["content"]
    return result


def first_title(root: Node) -> str | None:
    for node in root.walk():
        if node.tag == "title":
            return clean_text(node.text())
    return None


def product_id(site: str, url: str | None) -> str | None:
    match = PRODUCT_PATTERNS[site].search(url or "")
    return match.group(1) if match else None


def empty_record(site: str, url: str | None, source_mode: str, strategy: str) -> dict[str, Any]:
    return {
        "site": site,
        "product_id": product_id(site, url),
        "title": None,
        "price": None,
        "original_price": None,
        "currency": None,
        "price_qualifier": None,
        "rating": None,
        "review_count": None,
        "sold_count": None,
        "availability": None,
        "brand": None,
        "category": None,
        "variants": [],
        "images": [],
        "shipping": None,
        "url": canonical_url(url),
        "source_mode": source_mode,
        "extraction_strategy": strategy,
        "retrieved_at": now_iso(),
    }


def jsonld_products(root: Node) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item)
        elif isinstance(value, dict):
            kind = value.get("@type")
            kinds = kind if isinstance(kind, list) else [kind]
            if any(str(x).lower() == "product" for x in kinds if x):
                products.append(value)
            for nested in value.values():
                if isinstance(nested, (dict, list)):
                    visit(nested)

    for node in root.walk():
        if node.tag != "script" or node.attrs.get("type", "").lower() != "application/ld+json":
            continue
        raw = "".join(x for x in node.children if isinstance(x, str)).strip()
        if not raw:
            continue
        try:
            visit(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return products


def records_from_jsonld(root: Node, site: str, source_url: str, source_mode: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for item in jsonld_products(root):
        offers = item.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        rating = item.get("aggregateRating") or {}
        brand = item.get("brand") or {}
        image = item.get("image") or []
        if isinstance(image, str):
            image = [image]
        url = canonical_url(item.get("url"), source_url) or canonical_url(source_url)
        record = empty_record(site, url, source_mode, "json_ld_product")
        record.update(
            title=clean_text(item.get("name")),
            price=number(offers.get("price") or offers.get("lowPrice")),
            currency=clean_text(offers.get("priceCurrency")),
            availability=clean_text(offers.get("availability")),
            rating=number(rating.get("ratingValue")),
            review_count=integer(rating.get("reviewCount") or rating.get("ratingCount")),
            brand=clean_text(brand.get("name") if isinstance(brand, dict) else brand),
            category=clean_text(item.get("category")),
            images=[canonical_url(x, source_url) for x in image if canonical_url(x, source_url)],
        )
        records.append(record)
    return records


def record_from_meta(root: Node, site: str, source_url: str, source_mode: str) -> dict[str, Any] | None:
    metas = meta_map(root)
    title = clean_text(metas.get("og:title") or first_title(root))
    is_product = metas.get("og:type", "").lower() == "product" or bool(PRODUCT_PATTERNS[site].search(source_url))
    generic_titles = {"temu", "shein", "women's & men's clothing, shop online fashion | shein"}
    if not is_product or not title or title.lower() in generic_titles:
        return None
    title = re.sub(r"\s*(?:\||-)\s*(?:SHEIN(?: USA)?|Temu)\s*$", "", title, flags=re.I)
    url = canonical_url(metas.get("og:url"), source_url) or canonical_url(source_url)
    record = empty_record(site, url, source_mode, "open_graph_product")
    record.update(
        title=clean_text(title),
        price=number(metas.get("product:price:amount")),
        currency=clean_text(metas.get("product:price:currency")),
        availability=clean_text(metas.get("product:availability")),
        brand=clean_text(metas.get("product:brand")),
        category=clean_text(metas.get("product:category")),
        images=[canonical_url(metas["og:image"], source_url)] if metas.get("og:image") else [],
    )
    return record


def ancestor_with_class(node: Node, name_fragment: str) -> Node:
    current = node
    while current.parent:
        if name_fragment in current.attrs.get("class", ""):
            return current
        current = current.parent
    return node


def first_descendant(node: Node, predicate) -> Node | None:
    return next((item for item in node.walk() if item is not node and predicate(item)), None)


def shein_cards(root: Node, source_url: str, source_mode: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    anchors = [n for n in root.walk() if n.tag == "a" and PRODUCT_PATTERNS["shein"].search(n.attrs.get("href", ""))]
    anchors.sort(key=lambda n: bool(n.attrs.get("data-title") or n.attrs.get("data-price")), reverse=True)
    for anchor in anchors:
        url = canonical_url(anchor.attrs.get("href"), source_url)
        pid = product_id("shein", url)
        if not pid or pid in seen:
            continue
        seen.add(pid)
        card = ancestor_with_class(anchor, "product-card")
        card_text = card.text()
        title = clean_text(anchor.attrs.get("data-title") or anchor.attrs.get("aria-label") or anchor.text())
        sold_source = anchor.attrs.get("data-sales-label", "") + " " + card_text
        sold = re.search(r"([\d.]+[KMB]?\+?)\s*_?sold", sold_source, re.I)
        image = first_descendant(card, lambda n: n.tag == "img" and bool(n.attrs.get("src") or n.attrs.get("data-src")))
        record = empty_record("shein", url, source_mode, "shein_product_card")
        record.update(
            product_id=pid,
            title=title,
            price=number(anchor.attrs.get("data-price") or anchor.attrs.get("data-us-price")),
            original_price=number(anchor.attrs.get("data-us-origin-price")),
            currency="USD" if "$" in card_text or anchor.attrs.get("data-us-price") else None,
            price_qualifier="after coupon" if "after coupon" in card_text.lower() else None,
            sold_count=sold.group(1) if sold else None,
            images=[canonical_url(image.attrs.get("src") or image.attrs.get("data-src"), source_url)] if image else [],
        )
        records.append(record)
    return records


def temu_cards(root: Node, source_url: str, source_mode: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for anchor in root.walk():
        href = anchor.attrs.get("href", "")
        if anchor.tag != "a" or not PRODUCT_PATTERNS["temu"].search(href):
            continue
        url = canonical_url(href, source_url)
        pid = product_id("temu", url)
        if not pid or pid in seen:
            continue
        seen.add(pid)
        card_text = anchor.text()
        tooltip = first_descendant(anchor, lambda n: bool(n.attrs.get("data-tooltip-title")))
        heading = first_descendant(anchor, lambda n: n.tag in {"h1", "h2", "h3"})
        image = first_descendant(anchor, lambda n: n.tag == "img" and bool(n.attrs.get("src")))
        title = clean_text(
            (tooltip.attrs.get("data-tooltip-title") if tooltip else None)
            or (heading.text() if heading else None)
            or (image.attrs.get("alt") if image else None)
        )
        prices = [number(m.group(1)) for m in re.finditer(r"\$\s*([\d,]+(?:\.\d{1,2})?)", card_text)]
        prices = [x for i, x in enumerate(prices) if x is not None and x not in prices[:i]]
        original_match = re.search(r"Original price\s*\$\s*([\d,.]+)", card_text, re.I)
        rating_match = re.search(r"([0-5](?:\.\d+)?)\s+out of five stars", card_text, re.I)
        review_match = re.search(r"([\d,]+)\s+reviews?", card_text, re.I)
        sold_match = re.search(r"([\d.]+[KMB]?\+?)\s*sold", card_text, re.I)
        record = empty_record("temu", url, source_mode, "temu_goods_card")
        record.update(
            product_id=pid,
            title=title,
            price=prices[0] if prices else None,
            original_price=number(original_match.group(1)) if original_match else (prices[1] if len(prices) > 1 else None),
            currency="USD" if prices else None,
            rating=number(rating_match.group(1)) if rating_match else None,
            review_count=integer(review_match.group(1)) if review_match else None,
            sold_count=sold_match.group(1) if sold_match else None,
            images=[canonical_url(image.attrs.get("src"), source_url)] if image else [],
        )
        records.append(record)
    return records


def merge_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for index, record in enumerate(records):
        key = record.get("url") or f"index:{index}"
        if key not in merged:
            merged[key] = record
            order.append(key)
            continue
        target = merged[key]
        for name, value in record.items():
            if target.get(name) in (None, [], "") and value not in (None, [], ""):
                target[name] = value
    return [merged[key] for key in order]


def detect_block(site: str, final_url: str, source: str) -> str | None:
    probe = (final_url + " " + source[:120000]).lower()
    if site == "shein" and (
        "/risk/challenge" in probe
        or "captcha_type=" in probe
        or "please click to complete the following actions to verify you are human" in probe
    ):
        return "shein_risk_challenge"
    if site == "temu" and (
        "/login.html" in final_url.lower()
        or ("sign in / register" in probe and "please enter your email address" in probe)
    ):
        return "temu_login_wall"
    if "captcha" in probe and ("verify you are human" in probe or "challenge" in probe):
        return "captcha"
    return None


def extract(source: str, source_url: str, site: str, source_mode: str, max_results: int) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    root = parse_html(source)
    records: list[dict[str, Any]] = []
    strategies: list[str] = []
    ld = records_from_jsonld(root, site, source_url, source_mode)
    if ld:
        records.extend(ld)
        strategies.append("json_ld_product")
    meta_record = record_from_meta(root, site, source_url, source_mode)
    if meta_record:
        records.append(meta_record)
        strategies.append("open_graph_product")
    cards = shein_cards(root, source_url, source_mode) if site == "shein" else temu_cards(root, source_url, source_mode)
    if cards:
        records.extend(cards)
        strategies.append("site_product_cards")
    merged = merge_records(records)
    merged = [r for r in merged if r.get("title") or r.get("price") is not None][:max_results]
    return merged, {
        "strategies": strategies,
        "product_url_signals": len(PRODUCT_PATTERNS[site].findall(source)),
        "document_title": first_title(root),
    }


def state_root() -> Path:
    return Path(os.environ.get("CODEX_STATE_HOME", str(Path.home() / ".codex" / "state"))) / "scrape-shein-temu"


def cache_paths(url: str) -> tuple[Path, Path]:
    digest = hashlib.sha256(url.encode()).hexdigest()
    return state_root() / "cache" / f"{digest}.html.gz", state_root() / "cache" / f"{digest}.json"


def fetch(url: str, timeout: int, cache_ttl: int, fresh: bool) -> tuple[str, str, int, bool]:
    body_path, meta_path = cache_paths(url)
    if not fresh and body_path.exists() and meta_path.exists() and time.time() - meta_path.stat().st_mtime <= cache_ttl:
        with gzip.open(body_path, "rt", encoding="utf-8", errors="replace") as handle:
            body = handle.read()
        meta = json.loads(meta_path.read_text())
        return body, meta["final_url"], int(meta["http_status"]), True
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "DNT": "1",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read()
            body = raw.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
            final_url = response.geturl()
            status = int(response.status)
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        final_url = exc.geturl()
        status = int(exc.code)
    body_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(body_path, "wt", encoding="utf-8") as handle:
        handle.write(body)
    os.chmod(body_path, 0o600)
    meta_path.write_text(json.dumps({"final_url": final_url, "http_status": status, "retrieved_at": now_iso()}, indent=2))
    os.chmod(meta_path, 0o600)
    return body, final_url, status, False


def save_evidence(source: str, result: dict[str, Any]) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    digest = hashlib.sha256((result.get("final_url") or "").encode()).hexdigest()[:10]
    folder = state_root() / "evidence" / f"{stamp}-{result.get('site')}-{digest}"
    suffix = 1
    while folder.exists():
        folder = folder.with_name(folder.name + f"-{suffix}")
        suffix += 1
    folder.mkdir(parents=True)
    html_path = folder / "response.html.gz"
    with gzip.open(html_path, "wt", encoding="utf-8") as handle:
        handle.write(source)
    result_path = folder / "result.json"
    result_path.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    os.chmod(html_path, 0o600)
    os.chmod(result_path, 0o600)
    return str(folder)


def validate_records(records: list[dict[str, Any]], required: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    useful = [record for record in records if isinstance(record, dict)]
    missing: list[dict[str, Any]] = []
    for index, record in enumerate(useful):
        absent = [name for name in required if record.get(name) in (None, "", [])]
        if absent:
            missing.append({"record_index": index, "url": record.get("url"), "fields": absent})
    return useful, missing


def result_envelope(
    *, site: str, operation: str, required: list[str], records: list[dict[str, Any]], final_url: str | None,
    http_status: int | None, cache_hit: bool, block_reason: str | None, extraction_diag: dict[str, Any], source_mode: str,
) -> dict[str, Any]:
    records, missing = validate_records(records, required)
    if block_reason and not records:
        status, failure_class = "blocked", "access_blocked"
    elif not records:
        status = "incomplete"
        failure_class = "parser_miss" if extraction_diag.get("product_url_signals") else "no_product_data"
    elif missing:
        status, failure_class = "incomplete", "parser_miss"
    else:
        status, failure_class = "complete", None
    return {
        "schema_version": SCHEMA_VERSION,
        "status": status,
        "site": site,
        "operation": operation,
        "required_fields": required,
        "final_url": final_url,
        "retrieved_at": now_iso(),
        "records": records,
        "diagnostics": {
            "failure_class": failure_class,
            "missing_fields": missing,
            "block_reason": block_reason,
            "http_status": http_status,
            "cache_hit": cache_hit,
            "source_mode": source_mode,
            "strategies": extraction_diag.get("strategies", []),
            "product_url_signals": extraction_diag.get("product_url_signals", 0),
            "document_title": extraction_diag.get("document_title"),
            "should_patch_parser": failure_class == "parser_miss",
            "evidence_dir": None,
        },
    }


def parse_required(value: str) -> list[str]:
    return list(dict.fromkeys(item.strip() for item in value.split(",") if item.strip()))


def search_url(site: str, query: str) -> str:
    if site == "shein":
        return f"https://us.shein.com/pdsearch/{quote(query, safe='')}/"
    return f"https://www.temu.com/search_result.html?search_key={quote_plus(query)}"


def normalize_fallback_records(records: Any, site: str) -> list[dict[str, Any]]:
    if isinstance(records, dict) and "records" in records:
        records = records["records"]
    if not isinstance(records, list):
        raise ValueError("Fallback JSON must be an array of records or an object containing records")
    normalized: list[dict[str, Any]] = []
    for raw in records:
        if not isinstance(raw, dict):
            continue
        record = empty_record(
            site,
            raw.get("url"),
            raw.get("source_mode") or "computer_use",
            raw.get("extraction_strategy") or "validated_ui_fallback",
        )
        for key in record:
            if key in raw:
                record[key] = raw[key]
        record["site"] = site
        record["product_id"] = record.get("product_id") or product_id(site, record.get("url"))
        normalized.append(record)
    return normalized


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--url")
    source.add_argument("--query")
    source.add_argument("--input-html", type=Path)
    source.add_argument("--validate-json", type=Path)
    parser.add_argument("--site", choices=["shein", "temu"])
    parser.add_argument("--source-url", help="Required with --input-html when the site cannot be inferred")
    parser.add_argument("--required", default="title,price,url")
    parser.add_argument("--max-results", type=int, default=20)
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--cache-ttl", type=int, default=900)
    parser.add_argument("--fresh", action="store_true")
    parser.add_argument("--no-evidence", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    required = parse_required(args.required)
    if args.validate_json:
        if not args.site:
            raise SystemExit("--site is required with --validate-json")
        payload_text = sys.stdin.read() if str(args.validate_json) == "-" else args.validate_json.read_text()
        payload = json.loads(payload_text)
        records = normalize_fallback_records(payload, args.site)
        result = result_envelope(
            site=args.site, operation="validate_fallback", required=required, records=records, final_url=None,
            http_status=None, cache_hit=False, block_reason=None,
            extraction_diag={"strategies": ["validated_ui_fallback"]}, source_mode="computer_use",
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0 if result["status"] == "complete" else 2

    if args.query and not args.site:
        raise SystemExit("--site is required with --query")
    operation = "search" if args.query else "product_or_listing"
    requested_url = search_url(args.site, args.query) if args.query else (args.url or args.source_url)
    site = detect_site(requested_url, args.site)
    if not site:
        raise SystemExit("Could not infer site; pass --site shein or --site temu")

    try:
        if args.input_html:
            source_text = args.input_html.read_text(encoding="utf-8", errors="replace")
            final_url = requested_url or f"https://www.{site}.com/"
            http_status, cache_hit, source_mode = None, False, "html_file"
        else:
            source_text, final_url, http_status, cache_hit = fetch(
                requested_url, args.timeout, args.cache_ttl, args.fresh
            )
            source_mode = "http"
        block_reason = detect_block(site, final_url, source_text)
        records, extraction_diag = extract(source_text, final_url, site, source_mode, args.max_results)
        result = result_envelope(
            site=site, operation=operation, required=required, records=records, final_url=final_url,
            http_status=http_status, cache_hit=cache_hit, block_reason=block_reason,
            extraction_diag=extraction_diag, source_mode=source_mode,
        )
        if result["status"] != "complete" and not args.no_evidence and not args.input_html:
            result["diagnostics"]["evidence_dir"] = save_evidence(source_text, result)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return {"complete": 0, "incomplete": 2, "blocked": 3, "error": 1}[result["status"]]
    except (OSError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        result = {
            "schema_version": SCHEMA_VERSION,
            "status": "error",
            "site": site,
            "operation": operation,
            "required_fields": required,
            "final_url": requested_url,
            "retrieved_at": now_iso(),
            "records": [],
            "diagnostics": {
                "failure_class": "transport_or_parse_error",
                "error_type": type(exc).__name__,
                "message": str(exc),
                "should_patch_parser": False,
                "evidence_dir": None,
            },
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
