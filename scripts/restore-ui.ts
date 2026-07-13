/**
 * Restores the original UI by simply reloading the page.
 * Since simulate-drift only mutates the DOM in-memory,
 * a reload reverts all changes.
 *
 * Usage: npx ts-node scripts/restore-ui.ts
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://dev.mykcpl.com/admin/index.html';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  console.log('UI restored to original state (fresh page load).');
  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
