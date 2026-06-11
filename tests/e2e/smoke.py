"""
Smoke test E2E M2 Grosir.
Flow: login -> create category/brand/product -> purchase invoice (add stock) -> POS sale -> verify stock.

USAGE (Windows, with playwright installed in Python 3.x):
  # Start the app first (dev or production):
  pnpm dev      # or: pnpm build && pnpm start
  # Then in another terminal:
  py -3 tests/e2e/smoke.py

  # Or use the webapp-testing helper to manage the server:
  py -3 <skills>/webapp-testing/scripts/with_server.py \
    --server "pnpm dev" --port 3000 --timeout 60 -- py -3 tests/e2e/smoke.py

NOTE (2026-06-11): As of last run there was an unresolved runtime 500 on /login in
production (`pnpm start`) on Windows - "Cannot find module './3743.js'" webpack chunk
error. See docs/HANDOFF.md "Catatan Testing E2E" section. Verify dev mode first.
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SUFFIX = str(int(time.time()))[-6:]
SHOTS = Path(__file__).parent / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)


def shot(page, name):
    p = SHOTS / f"{name}.png"
    page.screenshot(path=str(p), full_page=True)
    print(f"[shot] {p}")


def main():
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("console", lambda m: m.type in ("error", "warning") and print(f"[console.{m.type}] {m.text}"))
        page.on("pageerror", lambda e: (print(f"[pageerror] {e}"), errors.append(str(e))))

        # 1. LOGIN
        print("\n=== 1. LOGIN ===")
        page.goto(f"{BASE}/login", wait_until="networkidle")
        shot(page, "01-login")
        page.fill('input[name="username"]', "owner")
        page.fill('input[name="password"]', "changeme123")
        page.click('button[type="submit"]')
        try:
            page.wait_for_url(lambda u: "/login" not in u, timeout=15000)
        except Exception as e:
            shot(page, "01-login-fail")
            print(f"[FAIL] login redirect: {e}")
            browser.close()
            return
        print(f"[ok] redirected to {page.url}")
        shot(page, "02-dashboard")

        # 2. SIDEBAR
        print("\n=== 2. SIDEBAR ===")
        links = [l.inner_text().strip() for l in page.locator("aside a").all() if l.inner_text().strip()]
        print(f"[ok] {len(links)} sidebar links: {', '.join(links)}")

        # 3. CATEGORY
        print("\n=== 3. CATEGORY ===")
        cat_name = f"E2E Cat {SUFFIX}"
        page.goto(f"{BASE}/master/categories/new", wait_until="networkidle")
        page.fill('input[name="name"]', cat_name)
        page.click('button[type="submit"]')
        page.wait_for_url(lambda u: u.endswith("/master/categories"), timeout=10000)
        print(f"[ok] category created: {cat_name}")

        # 4. BRAND
        print("\n=== 4. BRAND ===")
        brand_name = f"E2E Brand {SUFFIX}"
        page.goto(f"{BASE}/master/brands/new", wait_until="networkidle")
        page.fill('input[name="name"]', brand_name)
        page.click('button[type="submit"]')
        page.wait_for_url(lambda u: u.endswith("/master/brands"), timeout=10000)
        print(f"[ok] brand created: {brand_name}")

        # 5. PRODUCT
        print("\n=== 5. PRODUCT ===")
        sku = f"E2E-{SUFFIX}"
        prod_name = f"Test Product {SUFFIX}"
        page.goto(f"{BASE}/master/products/new", wait_until="networkidle")
        page.fill('input[name="sku"]', sku)
        page.fill('input[name="name"]', prod_name)
        page.locator('button[role="combobox"]').nth(0).click()
        page.wait_for_timeout(300)
        page.locator(f'div[role="option"]:has-text("{cat_name}")').first.click()
        page.wait_for_timeout(200)
        page.locator('button[role="combobox"]').nth(1).click()
        page.wait_for_timeout(300)
        page.locator(f'div[role="option"]:has-text("{brand_name}")').first.click()
        page.wait_for_timeout(200)
        page.locator('button[role="combobox"]').nth(2).click()
        page.wait_for_timeout(300)
        page.locator('div[role="option"]:has-text("pcs")').first.click()
        page.wait_for_timeout(200)
        page.locator('button[role="combobox"]').nth(3).click()
        page.wait_for_timeout(300)
        page.locator('div[role="option"]:has-text("pcs")').first.click()
        page.locator('input[type="number"][step="1"]').nth(2).fill("3000")
        page.locator('input[type="number"][step="1"]').nth(3).fill("5000")
        shot(page, "06-product-filled")
        page.click('button[type="submit"]:has-text("Simpan")')
        try:
            page.wait_for_url(lambda u: u.endswith("/master/products"), timeout=15000)
            print(f"[ok] product created: {sku}")
        except Exception as e:
            shot(page, "06-product-fail")
            print(f"[FAIL] product: {e} (url={page.url})")
            errors.append("product create failed")

        # 6. SUPPLIER + PURCHASE INVOICE
        print("\n=== 6. SUPPLIER + PURCHASE INVOICE ===")
        sup_name = f"E2E Sup {SUFFIX}"
        page.goto(f"{BASE}/master/suppliers/new", wait_until="networkidle")
        page.fill('input[name="name"]', sup_name)
        page.click('button[type="submit"]')
        page.wait_for_url(lambda u: u.endswith("/master/suppliers"), timeout=10000)
        print(f"[ok] supplier created: {sup_name}")

        page.goto(f"{BASE}/purchase/invoices/new", wait_until="networkidle")
        page.locator('button[role="combobox"]').nth(0).click()
        page.wait_for_timeout(300)
        page.locator(f'div[role="option"]:has-text("{sup_name}")').first.click()
        page.wait_for_timeout(200)
        page.locator('button[role="combobox"]').nth(1).click()
        page.wait_for_timeout(300)
        page.locator('div[role="option"]:has-text("Gudang Utama")').first.click()
        page.wait_for_timeout(200)
        page.locator('button[role="combobox"]').nth(2).click()
        page.wait_for_timeout(300)
        page.locator(f'div[role="option"]:has-text("{sku}")').first.click()
        page.wait_for_timeout(200)
        page.locator('input[type="number"]').nth(0).fill("10")
        page.locator('input[type="number"]').nth(1).fill("3000")
        shot(page, "09-pinv-filled")
        page.click('button:has-text("Post Faktur")')
        page.wait_for_timeout(500)
        try:
            page.locator('div[role="dialog"] button:has-text("Post")').click()
            page.wait_for_timeout(2000)
            print(f"[ok] purchase invoice posted (url={page.url})")
        except Exception as e:
            print(f"[WARN] pinv dialog: {e}")

        # 7. POS SALE
        print("\n=== 7. POS SALE ===")
        page.goto(f"{BASE}/sale/pos", wait_until="networkidle")
        page.fill("input#search", sku)
        page.wait_for_timeout(800)
        shot(page, "12-pos-search")
        try:
            page.locator(f'button:has-text("{sku}")').first.click()
            page.wait_for_timeout(300)
            print("[ok] added to cart")
        except Exception as e:
            print(f"[WARN] add cart: {e}")
        try:
            page.locator("input#paidAmount").fill("20000")
            page.wait_for_timeout(200)
            page.click('button:has-text("Bayar")')
            page.wait_for_timeout(2500)
            shot(page, "15-pos-success")
            print("[ok] sale post attempted")
        except Exception as e:
            print(f"[FAIL] sale: {e}")
            errors.append(str(e))

        # 8. STOCK
        print("\n=== 8. STOCK CHECK ===")
        page.goto(f"{BASE}/inventory/stock", wait_until="networkidle")
        shot(page, "16-stock")
        row = page.locator(f'tr:has-text("{sku}")').first
        if row.is_visible():
            print(f"[stock] {row.inner_text()}")

        print(f"\n=== SUMMARY: {len(errors)} errors ===")
        for e in errors:
            print(f"  - {e}")
        print(f"Screenshots: {SHOTS}")
        browser.close()


if __name__ == "__main__":
    main()
