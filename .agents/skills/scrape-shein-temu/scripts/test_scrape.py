#!/usr/bin/env python3
from pathlib import Path
import importlib.util
import sys

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("shop_scraper", HERE / "scrape.py")
assert SPEC and SPEC.loader
MOD = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MOD
SPEC.loader.exec_module(MOD)


def load(name):
    return (HERE / "fixtures" / name).read_text()


def test_shein_cards():
    records, diag = MOD.extract(load("shein_cards.html"), "https://us.shein.com/women-dresses-c-1727.html", "shein", "html_file", 20)
    assert len(records) == 2
    assert records[0]["title"] == "EMERY ROSE Casual A-Line Dress"
    assert records[0]["price"] == 11.89
    assert records[0]["original_price"] == 13.39
    assert records[0]["sold_count"] == "500+"
    assert records[0]["url"] == "https://us.shein.com/EMERY-ROSE-Dress-p-429197162.html"
    assert diag["product_url_signals"] >= 2


def test_temu_cards():
    records, _ = MOD.extract(load("temu_cards.html"), "https://www.temu.com/all-dresses-s.html", "temu", "html_file", 20)
    assert len(records) == 2
    assert records[0]["title"] == "French-Style Floral Summer Dress"
    assert records[0]["price"] == 18.56
    assert records[0]["original_price"] == 21.43
    assert records[0]["rating"] == 4.7
    assert records[0]["review_count"] == 514
    assert records[0]["sold_count"] == "31K+"


def test_product_meta():
    records, _ = MOD.extract(load("shein_product_meta.html"), "https://us.shein.com/EMERY-ROSE-Dress-p-429197162.html", "shein", "html_file", 20)
    assert len(records) == 1
    assert records[0]["title"] == "EMERY ROSE Casual A-Line Dress"
    assert records[0]["price"] == 11.89
    assert records[0]["currency"] == "USD"
    assert records[0]["availability"] == "in stock"


def test_block_classification():
    source = load("shein_blocked.html")
    reason = MOD.detect_block("shein", "https://us.shein.com/risk/challenge?captcha_type=909", source)
    assert reason == "shein_risk_challenge"
    result = MOD.result_envelope(
        site="shein", operation="search", required=["title", "price", "url"], records=[],
        final_url="https://us.shein.com/risk/challenge", http_status=200, cache_hit=False,
        block_reason=reason, extraction_diag={}, source_mode="html_file",
    )
    assert result["status"] == "blocked"
    assert result["diagnostics"]["failure_class"] == "access_blocked"
    assert result["diagnostics"]["should_patch_parser"] is False


def main():
    tests = [test_shein_cards, test_temu_cards, test_product_meta, test_block_classification]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"PASS {len(tests)} tests")


if __name__ == "__main__":
    main()
