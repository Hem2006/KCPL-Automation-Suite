/**
 * Crawler that logs into the KCPL admin app, visits every Accounts / HR / Audit
 * sub-page, screenshots + dumps the DOM, and also opens Add/Create dialogs or
 * form pages so their DOM is captured too.
 *
 * Output: dumps/<module>/<section>/<slug>[-list|-add|-step2].{png,html}
 *
 * Run: npx ts-node scripts/dump-screens.ts
 */
import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(process.cwd(), 'dumps');
const BASE_URL = 'https://dev.mykcpl.com/admin/index.html';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function noBackdrop(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('.MuiBackdrop-root');
    if (!el) return true;
    const s = window.getComputedStyle(el);
    return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
  }, { timeout: 25000 }).catch(() => {});
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function save(page: Page, name: string) {
  const file = path.join(OUT, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: `${file}.png`, fullPage: true }).catch(() => {});
  fs.writeFileSync(`${file}.html`, await page.content(), 'utf-8');
  console.log('  saved:', name);
}

async function closeDialog(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  const cancel = page.getByRole('button', { name: 'Cancel' });
  if (await cancel.isVisible({ timeout: 500 }).catch(() => false)) {
    await cancel.click().catch(() => {});
  }
  await noBackdrop(page);
}

/**
 * Try to open the Add/Create entry point on the current page.
 * Handles both dialog opens AND full-page navigations (like Add Vendor step 2).
 */
async function captureAdd(page: Page, outBase: string) {
  await noBackdrop(page);
  const urlBefore = page.url();

  // Look for an Add button (the top-right + button or any visible Add button)
  const addBtn = page
    .locator('button')
    .filter({ hasText: /^\s*Add\s*$|^\s*\+\s*$/ })
    .or(page.locator('[data-testid="AddIcon"]').locator('..'))
    .first();

  const visible = await addBtn.isVisible({ timeout: 2000 }).catch(() => false);
  if (!visible) {
    console.log('  (no Add button found)');
    return;
  }

  await addBtn.click();
  await page.waitForTimeout(800);
  await noBackdrop(page);

  const urlAfter = page.url();
  const navigated = urlAfter !== urlBefore;

  await save(page, `${outBase}-add`);

  if (navigated) {
    // Full-page form — go back
    await page.goBack();
    await noBackdrop(page);
    await page.waitForTimeout(500);
  } else {
    // Dialog — close it
    await closeDialog(page);
  }
}

// ---------------------------------------------------------------------------
// Navigation primitives
// ---------------------------------------------------------------------------
async function goModule(page: Page, name: string) {
  console.log(`\n=== MODULE: ${name} ===`);
  // Try button role first, then any element with that text
  for (const loc of [
    page.getByRole('button', { name, exact: true }),
    page.getByText(name, { exact: true }).first(),
    page.locator(`[aria-label="${name}"]`).first(),
  ]) {
    if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loc.click();
      await noBackdrop(page);
      await page.waitForTimeout(1000);
      return;
    }
  }
  console.log(`  !! Could not find module tab for: ${name}`);
}

async function ensureExpanded(page: Page, sectionName: string, firstChild: string) {
  // Always click the section button to ensure it's open; if already open clicking again closes it,
  // so first check if firstChild is visible
  for (let attempt = 0; attempt < 3; attempt++) {
    const firstItem = page.getByText(firstChild, { exact: true });
    if (await firstItem.isVisible({ timeout: 1500 }).catch(() => false)) return;
    const btn = page.getByRole('button', { name: sectionName, exact: true });
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  await noBackdrop(page);
}

async function visitPage(page: Page, text: string, outPath: string) {
  console.log(`\n  > ${text}`);
  try {
    const item = page.getByText(text, { exact: true });
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await item.click({ timeout: 15000 });
    await noBackdrop(page);
    await page.waitForTimeout(600);
    await save(page, `${outPath}-list`);
    await captureAdd(page, outPath);
  } catch (e: any) {
    console.log(`  !! SKIPPED (${e.message?.split('\n')[0]})`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // --- LOGIN ---
  console.log('Logging in...');
  await page.goto(BASE_URL);
  await page.locator('input[placeholder="Enter your username"]').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input[placeholder="Enter your username"]').fill('kcpl');
  await page.locator('input[placeholder="Enter your password"]').fill('kcpl');
  await page.locator('button[type="submit"]').click();
  // Wait for backdrop to clear after login
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await noBackdrop(page);
  // The module tabs (Accounts/HR/Audit) only appear after entering a section.
  // Click the first Operation sidebar icon to expand the sidebar into text mode.
  await page.locator('[data-testid="selectednavitecreationbutton0"]').click({ timeout: 10000 }).catch(async () => {
    // fallback: click any sidebar div role=button
    await page.locator('div[role="button"]').first().click({ timeout: 5000 }).catch(() => {});
  });
  await noBackdrop(page);
  await page.waitForTimeout(1500);
  // Now the module tabs should be visible
  await page.getByRole('button', { name: 'Creation', exact: true }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  console.log('Sidebar expanded.');

  // =========================================================================
  // ACCOUNTS
  // =========================================================================
  await goModule(page, 'Accounts');

  // -- Creation --
  await ensureExpanded(page, 'Creation', 'Add vendor');
  for (const sub of ['Add vendor', 'Bank', 'Group & Ledger creation', 'Chrages', 'GST & TDS']) {
    await visitPage(page, sub, `accounts/creation/${slug(sub)}`);
    // Re-open Creation section after each navigation (it may collapse)
    await ensureExpanded(page, 'Creation', 'Add vendor').catch(() => {});
  }

  // -- Transaction --
  const txItems = [
    'Add FD', 'Bank deposit', 'Bank withdrawal', 'General payment',
    'Petty cash payment', 'General receipt', 'Jounral vocher',
    'Contra Voucher', 'Add expense/Asset', 'CDR',
    'Bank reconciliation', 'Ledger view', 'Posting',
  ];
  await ensureExpanded(page, 'Transaction', 'Add FD');
  for (const sub of txItems) {
    await visitPage(page, sub, `accounts/transaction/${slug(sub)}`);
    await ensureExpanded(page, 'Transaction', 'Add FD').catch(() => {});
  }

  // -- Report --
  const reportItems = [
    'Cash in hand', 'Petty cash', 'Cheque in hand', 'Bank book',
    'GST Report', 'P & L', 'Balance sheet', 'Trail balance',
    'Day Book', 'Sales Register', 'Cash Book', 'CDR',
  ];
  await ensureExpanded(page, 'Report', 'Cash in hand');
  for (const sub of reportItems) {
    await visitPage(page, sub, `accounts/report/${slug(sub)}`);
    await ensureExpanded(page, 'Report', 'Cash in hand').catch(() => {});
  }

  // -- Favorite --
  console.log('\n  > Favorite');
  await page.getByText('Favorite', { exact: true }).first().click();
  await noBackdrop(page);
  await page.waitForTimeout(600);
  await save(page, 'accounts/favorite');

  // =========================================================================
  // HR
  // =========================================================================
  await goModule(page, 'HR');

  // -- Employee --
  await ensureExpanded(page, 'Employee', 'Employee Creation');
  for (const sub of ['Employee Creation', 'Advisor List']) {
    await visitPage(page, sub, `hr/employee/${slug(sub)}`);
    await ensureExpanded(page, 'Employee', 'Employee Creation').catch(() => {});
  }

  // -- Flat items --
  for (const sub of ['Incentive', 'Holiday', 'Designation', 'Dynamic Assign Value', 'Report']) {
    await visitPage(page, sub, `hr/${slug(sub)}`);
  }

  // -- Favorite --
  console.log('\n  > HR Favorite');
  await page.getByText('Favorite', { exact: true }).first().click();
  await noBackdrop(page);
  await page.waitForTimeout(600);
  await save(page, 'hr/favorite');

  // =========================================================================
  // AUDIT
  // =========================================================================
  await goModule(page, 'Audit');

  for (const sub of ['Scheme', 'Sb list']) {
    await visitPage(page, sub, `audit/${slug(sub)}`);
  }

  // -- Favorite --
  console.log('\n  > Audit Favorite');
  await page.getByText('Favorite', { exact: true }).first().click();
  await noBackdrop(page);
  await page.waitForTimeout(600);
  await save(page, 'audit/favorite');

  // =========================================================================
  await browser.close();
  console.log(`\n✅ Done — all dumps in: ${OUT}`);
})();
