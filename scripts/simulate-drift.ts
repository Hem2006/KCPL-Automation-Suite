/**
 * Simulates UI drift by injecting a Playwright script that mutates selectors
 * on the live page. Run this against the dev server to test self-healing.
 *
 * Usage: npx ts-node scripts/simulate-drift.ts
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://dev.mykcpl.com/admin/index.html';

const MUTATIONS = [
  { selector: 'input[placeholder="Enter your username"]', attr: 'placeholder', newValue: 'User ID here' },
  { selector: 'input[placeholder="Enter your password"]', attr: 'placeholder', newValue: 'Secret key' },
  { selector: 'button[type="submit"]', attr: 'data-testid', newValue: 'login-btn-v2' },
  { selector: '#download', attr: 'id', newValue: 'export-btn' },
  { selector: '#searchInput', attr: 'id', newValue: 'global-search' },
  { selector: '#combo-box-demo', attr: 'id', newValue: 'phone-lookup' },
];

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  console.log('Applying selector mutations...\n');

  for (const m of MUTATIONS) {
    const count = await page.locator(m.selector).count();
    if (count > 0) {
      await page.evaluate(
        ({ sel, attr, val }) => {
          const el = document.querySelector(sel);
          if (el) el.setAttribute(attr, val);
        },
        { sel: m.selector, attr: m.attr, val: m.newValue },
      );
      console.log(`  Mutated: ${m.selector} → ${m.attr}="${m.newValue}"`);
    } else {
      console.log(`  Skipped (not found): ${m.selector}`);
    }
  }

  console.log('\nDrift applied. Browser will stay open — run tests now.');
  console.log('Press Ctrl+C to close.\n');

  await page.waitForTimeout(600_000);
  await browser.close();
}

main().catch(console.error);
