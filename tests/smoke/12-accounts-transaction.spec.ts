import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

async function cancelForm(page: Page) {
  await page.getByRole('button', { name: /Cancel/i }).click();
  const yesBtn = page.getByRole('button', { name: 'Yes' });
  if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
  await noBackdrop(page);
}

async function ensureAccountsTransactionOpen(page: Page) {
  // Defensively dismiss any dialog left open by a previous test on this
  // shared page before it blocks sidebar navigation
  const openDialog = page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)');
  if (await openDialog.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    const yesBtn = page.getByRole('button', { name: /^(Yes|Cancel|Ok|Okay|Close)$/i });
    if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) await yesBtn.click();
    await openDialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const addFdItem = page.getByRole('menuitem', { name: 'Add FD' });
  if (await addFdItem.isVisible().catch(() => false)) return;

  const txBtn = page.getByRole('button', { name: 'Transaction', exact: true });
  if (!(await txBtn.isVisible().catch(() => false))) {
    const accountsTab = page.getByText('Accounts', { exact: true });
    if (!(await accountsTab.isVisible({ timeout: 2000 }).catch(() => false))) {
      await page.locator('[data-testid="selectednavitecreationbutton0"]').click({ timeout: 5000 }).catch(async () => {
        await page.locator('div[role="button"]').first().click({ timeout: 5000 }).catch(() => {});
      });
      await noBackdrop(page);
      await page.waitForTimeout(1000);
      await accountsTab.waitFor({ state: 'visible', timeout: 10000 });
    }
    await accountsTab.click();
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await txBtn.waitFor({ state: 'visible', timeout: 15000 });
  }

  await txBtn.click();
  await addFdItem.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Accounts - Transaction - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await ensureAccountsTransactionOpen(page);
  });

  // ── ADD FD ──────────────────────────────────────────────────────────────
  test('Add FD - list page loads with table and columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add FD' }).click();
    await noBackdrop(page);

    await expect(page.getByText('FD information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'FD Bank (Group)', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'JV date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'JV number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'FD type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'FD date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'FD number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'FD value', exact: true })).toBeVisible();
  });

  test('Add FD - Add opens form with General/B.G radio and proceed', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add FD' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('FD voucher').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('radio', { name: 'General' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'B.G' })).toBeVisible();
    await expect(page.getByText('Credit information')).toBeVisible();
    await expect(page.getByRole('button', { name: /proceed/i })).toBeVisible();

    await page.goBack();
    await noBackdrop(page);
  });

  // ── BANK DEPOSIT ────────────────────────────────────────────────────────
  test('Bank deposit - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank deposit' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Bank deposit information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Bank Deposit count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Debit Ledegr Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Credit Ledger Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created By', exact: true })).toBeVisible();
  });

  test('Bank deposit - Add opens voucher form with Debit/Credit sections', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank deposit' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Debit Information').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Credit Information').first()).toBeVisible();
    await expect(page.getByText('Naration')).toBeVisible();
    await expect(page.getByText(/Generate voucher/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── BANK WITHDRAWAL ────────────────────────────────────────────────────
  test('Bank withdrawal - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank withdrawal' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Bank Withdrawal information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Toatl Bank Withdrawal count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Debit Ledegr Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Credit Ledger Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
  });

  test('Bank withdrawal - Add opens form with Credit/Debit and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank withdrawal' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Withdrawal').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Credit Information').first()).toBeVisible();
    await expect(page.getByText('Debit Information').first()).toBeVisible();
    await expect(page.getByText('Naration')).toBeVisible();
    await expect(page.getByText(/Generate voucher/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── GENERAL PAYMENT ─────────────────────────────────────────────────────
  test('General payment - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'General payment' }).click();
    await noBackdrop(page);

    await expect(page.getByText('General payment information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Toatl General payment count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
  });

  test('General payment - Add opens voucher form with Debit/Credit and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'General payment' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('General payment voucher').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Debit information/i).first()).toBeVisible();
    await expect(page.getByText(/Credit information/i).first()).toBeVisible();
    await expect(page.getByText('Naration')).toBeVisible();
    await expect(page.getByText(/Generate payemnt voucher/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── PETTY CASH PAYMENT ──────────────────────────────────────────────────
  test('Petty cash payment - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Petty cash payment' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Petty Cash information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Petty Cash count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Debit Ledegr Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Credit Ledger Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
  });

  test('Petty cash payment - Add opens voucher form', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Petty cash payment' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Petty cash voucher').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Credit information/i).first()).toBeVisible();
    await expect(page.getByText(/Debit information/i).first()).toBeVisible();
    await expect(page.getByText('Naration')).toBeVisible();
    await expect(page.getByText(/Generate payemnt voucher/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── GENERAL RECEIPT ─────────────────────────────────────────────────────
  test('General receipt - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'General receipt' }).click();
    await noBackdrop(page);

    await expect(page.getByText('General receipt information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Toatl General receipt count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
  });

  test('General receipt - Add opens receipt generation form', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'General receipt' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('General receipt').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Credit information/i).first()).toBeVisible();
    await expect(page.getByText(/Debit information/i).first()).toBeVisible();
    await expect(page.getByText('Naration')).toBeVisible();
    await expect(page.getByText(/Receipt Generation/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── JOURNAL VOUCHER ─────────────────────────────────────────────────────
  test('Jounral vocher - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Jounral vocher' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Journal voucher information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Toatl Journal voucher count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Debit Ledegr Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Credit Ledger Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
  });

  test('Jounral vocher - Add opens form with Credit/Debit and Generate JV', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Jounral vocher' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Journal Voucher').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('Debit-outline-information')).toBeVisible();
    await expect(page.getByText(/Generate JV/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── CONTRA VOUCHER ──────────────────────────────────────────────────────
  test('Contra Voucher - list page loads with columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Contra Voucher' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Contra voucher information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Contra voucher count/i)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Debit Ledegr Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Credit Ledger Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount', exact: true })).toBeVisible();
  });

  test('Contra Voucher - Add opens form with Bank/Cash radio and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Contra Voucher' }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Contra Voucher').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Select Ledger Type')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Bank' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Cash' })).toBeVisible();
    await expect(page.getByTestId('Debitt-information')).toBeVisible();
    await expect(page.getByText(/Generate Contra voucher/i).first()).toBeVisible();

    await cancelForm(page);
  });

  // ── ADD EXPENSE/ASSET ───────────────────────────────────────────────────
  test('Add expense/Asset - menu item is a dead link (app bug: no href)', async ({ authenticatedPage: page }) => {
    // Live-verified: this menuitem renders without an href, so clicking it
    // does not navigate anywhere.
    const item = page.getByRole('menuitem', { name: 'Add expense/Asset' });
    await expect(item).toBeVisible({ timeout: 10000 });
    await expect(item).not.toHaveAttribute('href', /.+/);

    const urlBefore = page.url();
    await item.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toBe(urlBefore);
  });

  // ── CDR ─────────────────────────────────────────────────────────────────
  test('CDR - menu item is a dead link (app bug: no href)', async ({ authenticatedPage: page }) => {
    // Live-verified: the Transaction-section CDR menuitem has no href (the
    // working CDR page lives under Report → CDR, covered in spec 13).
    const item = page.getByRole('menuitem', { name: 'CDR' }).first();
    await expect(item).toBeVisible({ timeout: 10000 });
    await expect(item).not.toHaveAttribute('href', /.+/);

    const urlBefore = page.url();
    await item.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toBe(urlBefore);
  });

  // ── BANK RECONCILIATION ─────────────────────────────────────────────────
  test('Bank reconcilation - page loads at bank summary route', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank reconcilation' }).click();
    await noBackdrop(page);

    await expect(page).toHaveURL(/collection\/banksummary/, { timeout: 10000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
  });

  // ── LEDGER VIEW ─────────────────────────────────────────────────────────
  test('Ledger view - page loads with Account search filters and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Ledger view' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Account Ledger View')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Account search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  // ── POSTING ─────────────────────────────────────────────────────────────
  test('Posting - page loads with Account search filters and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Posting' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Account search')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });
});

// ─── FORM FILL + SUBMIT TESTS ──────────────────────────────────────────────────
// Sidebar-only navigation (no page.goto / refresh) per project rules

// Navigate sidebar menuitem → list page → Add button → entry form.
// Retries the menuitem click once: navigating away from a just-saved view
// page occasionally swallows the first click.
async function openFormViaAdd(page: Page, menuItem: string, listAnchor: string | RegExp) {
  await page.getByRole('menuitem', { name: menuItem }).click();
  await noBackdrop(page);
  const anchor = page.getByText(listAnchor).first();
  if (!(await anchor.isVisible({ timeout: 5000 }).catch(() => false))) {
    await page.getByRole('menuitem', { name: menuItem }).click();
    await noBackdrop(page);
  }
  await expect(anchor).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await noBackdrop(page);
}

// Options inside the OPEN MUI popup only — some pages carry hidden native
// <option> elements that getByRole('option') would match first and hang on
const listOptions = (page: Page) => page.locator('[role="listbox"] [role="option"]');

// Force a MUI Autocomplete popup open. The reliable path in this app is the
// popup-indicator button (aria-label "Open"); fall back to click + ArrowDown.
async function openOptions(page: Page, input: ReturnType<Page['locator']>) {
  const root = input.locator('xpath=ancestor::*[contains(@class,"MuiAutocomplete-root")][1]');
  const openBtn = root.getByRole('button', { name: 'Open' });
  if (await openBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await openBtn.click();
    if (await listOptions(page).first().isVisible({ timeout: 2000 }).catch(() => false)) return;
  }
  await input.click({ force: true }).catch(() => {});
  if (await listOptions(page).first().isVisible({ timeout: 2000 }).catch(() => false)) return;
  await input.press('ArrowDown').catch(() => {});
  if (await listOptions(page).first().isVisible({ timeout: 2000 }).catch(() => false)) return;
  // Last resort: type a character — server-search autocompletes only render
  // options after input (selecting an option replaces the typed text)
  await input.pressSequentially('a').catch(() => {});
}

// Open an Autocomplete by its accessible name (combobox when valued, plain
// textbox when empty) and pick the first real (non-"Add ...") option
async function pickByName(page: Page, name: string | RegExp) {
  const input = page.getByRole('combobox', { name }).or(page.getByRole('textbox', { name })).first();
  await openOptions(page, input);
  await listOptions(page).first().waitFor({ state: 'visible', timeout: 8000 });
  const real = listOptions(page).filter({ hasNotText: /^Add / }).first();
  if (await real.isVisible({ timeout: 2000 }).catch(() => false)) {
    await real.click();
  } else {
    await listOptions(page).first().click();
  }
}

// Both voucher amounts render as spinbuttons named "Amount"
const amounts = (page: Page) => page.getByRole('spinbutton', { name: 'Amount' });

// Branch comboboxes are usually pre-filled with CORP_OFFICE but not always,
// and the ledger dropdowns have NO options until a branch is selected — so
// fill every empty Branch-ish combobox first ("Branch", "Fd at (Branch)",
// "Payment At Branchs", "Collection at (Branch)", ...)
// The Dr/Cr Ledger fields are NOT autocompletes: a plain textbox whose
// end-adornment button (data-testid="position-end") opens a MUI Menu of
// ledgers (role="menuitem"). Live-verified in the browser.
async function pickLedger(page: Page, nth = 0) {
  await page.locator('button[data-testid="position-end"]').nth(nth).click();
  // A menu from an earlier pickLedger call on the same page can leave a
  // stale/detached <ul role="menu"> node behind — scope to the LAST one
  // (MUI portals append new popovers to the end of <body>) so we always
  // click inside the menu that just opened, not a leftover one
  const menu = page.locator('ul[role="menu"]').last();
  const firstItem = menu.locator('[role="menuitem"]').first();
  await firstItem.waitFor({ state: 'visible', timeout: 8000 });
  await firstItem.click();
  // Confirm the menu actually closed before moving on; retry once if not
  if (await menu.isVisible({ timeout: 1500 }).catch(() => false)) {
    await firstItem.click({ force: true }).catch(() => {});
    await menu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(300);
}

async function fillBranches(page: Page) {
  const branches = page.getByRole('combobox', { name: /branch/i });
  const n = await branches.count();
  for (let i = 0; i < n; i++) {
    const b = branches.nth(i);
    if (await b.inputValue().catch(() => 'x')) continue;
    await openOptions(page, b);
    await listOptions(page).first().waitFor({ state: 'visible', timeout: 8000 });
    await listOptions(page).filter({ hasNotText: /^Add / }).first().click();
    await page.waitForTimeout(400);
  }
}

// Submit-button clicks occasionally time out against this live dev server
// under load even though the button is visible/enabled in screenshots —
// scroll it into view, wait for it explicitly, and retry once before failing.
async function clickSubmit(page: Page, name: string | RegExp) {
  const btn = page.getByRole('button', { name });
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  try {
    await btn.click({ timeout: 15000 });
  } catch {
    await btn.click({ timeout: 20000, force: true });
  }
}

// After submitting a voucher form: accept any confirmation dialog, then require
// a real success signal (toast / voucher number / confirmation) AND no error alert.
async function expectVoucherSuccess(page: Page) {
  const confirmBtn = page.locator('.MuiDialog-root').getByRole('button', { name: /^(Yes|Confirm|Ok|Okay)$/i });
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
    await noBackdrop(page).catch(() => {});
  }

  const success = page.getByText(/success/i)
    .or(page.getByText(/generated/i))
    .or(page.getByText(/saved/i))
    .or(page.getByText(/voucher no/i))
    .or(page.getByText(/voucher number/i))
    .or(page.getByText(/receipt number/i));
  await expect(success.first()).toBeVisible({ timeout: 20000 });

  // No error alert may be present alongside/instead of success
  const errorAlert = page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError');
  await expect(errorAlert).toHaveCount(0);

  // Some vouchers (e.g. FD) open a print/receipt preview dialog after
  // success — close it so it doesn't block the next test on this shared page
  const leftoverDialog = page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)');
  if (await leftoverDialog.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    const closeBtn = leftoverDialog.getByRole('button', { name: /^(Close|Ok|Okay|Done|Cancel)$/i }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await noBackdrop(page).catch(() => {});
  }
  await expect(leftoverDialog).toHaveCount(0, { timeout: 10000 });
}

test.describe('@smoke Accounts - Transaction - form submissions', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Extend here so the hook itself gets the long budget too
    test.setTimeout(180000);
    await ensureAccountsTransactionOpen(page);
  });

  test('Add FD — form fills General FD and submits', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'Add FD', 'FD information');
    await expect(page).toHaveURL(/fd-info/, { timeout: 10000 });
    await page.getByRole('radio', { name: 'General' }).click();
    await fillBranches(page);
    await pickByName(page, 'Cr bank (Ledger code/Name)');
    // Amount is a labeled MUI textbox, not input[type=number]
    await page.getByRole('textbox', { name: 'Amount' }).fill('5000');
    // Submit — a confirmation dialog with its own backdrop may open, so do NOT
    // wait for backdrop-hidden here; expectVoucherSuccess handles the dialog
    await clickSubmit(page, /proceed/i);
    await expectVoucherSuccess(page);
  });

  test('Bank deposit — form fills and generates voucher', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'Bank deposit', 'Bank deposit information');
    await expect(page.getByRole('heading', { name: /debit information/i }).first()).toBeVisible({ timeout: 10000 });
    await fillBranches(page);
    await pickLedger(page);
    await amounts(page).nth(0).fill('1000');
    await pickByName(page, 'Deposit Type');
    await amounts(page).nth(1).fill('1000');
    // Naration
    await page.getByLabel('Remarks').fill('Test bank deposit');
    await page.getByLabel('Deposit by (Name)').fill('Test Person');
    await page.getByLabel('Phone number').fill('9876543210');
    await clickSubmit(page, /Generate voucher/i);
    await expectVoucherSuccess(page);
  });

  test('Bank withdrawal — form fills and generates voucher', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'Bank withdrawal', 'Bank Withdrawal information');
    await expect(page.getByRole('heading', { name: /credit information/i }).first()).toBeVisible({ timeout: 10000 });
    await fillBranches(page);
    await pickLedger(page);
    await amounts(page).nth(0).fill('1000');
    await pickByName(page, 'Withdraw Type');
    await amounts(page).nth(1).fill('1000');
    // Naration
    await page.getByLabel('Remarks').fill('Test bank withdrawal');
    await page.getByLabel('Withdrawal by (name)').fill('Test Person');
    await page.getByLabel('Phone Number').fill('9876543210');
    await clickSubmit(page, /Generate voucher/i);
    await expectVoucherSuccess(page);
  });

  test('General payment — form fills and generates voucher', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'General payment', 'General payment information');
    await expect(page.getByRole('heading', { name: /debit information/i }).first()).toBeVisible({ timeout: 10000 });
    await fillBranches(page);
    await pickLedger(page);
    await amounts(page).nth(0).fill('500');
    await pickByName(page, 'Payment Type');
    await amounts(page).nth(1).fill('500');
    // Naration
    await page.getByLabel('Remarks').fill('Test general payment');
    await page.getByLabel('Phone number').fill('9876543210');
    await page.getByLabel('Paid by (name)').fill('Test Person');
    // App has intentional typo "payemnt" in button name
    await clickSubmit(page, 'Generate payemnt voucher');
    await expectVoucherSuccess(page);
  });

  test('Petty cash payment — form fills and generates voucher', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'Petty cash payment', 'Petty Cash information');
    await expect(page.getByRole('heading', { name: /debit information/i }).first()).toBeVisible({ timeout: 10000 });
    await fillBranches(page);
    await amounts(page).nth(0).fill('200');
    await pickLedger(page);
    await amounts(page).nth(1).fill('200');
    // Naration
    await page.getByLabel('Remarks').fill('Test petty cash payment');
    await page.getByLabel('Phone number').fill('9876543210');
    await page.getByLabel('Paid by name').fill('Test Person');
    // App has intentional typo "payemnt" in button name
    await clickSubmit(page, 'Generate payemnt voucher');
    await expectVoucherSuccess(page);
  });

  test('General receipt — form fills and generates receipt', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'General receipt', 'General receipt information');
    await expect(page.getByRole('heading', { name: /credit information/i }).first()).toBeVisible({ timeout: 10000 });
    await fillBranches(page);
    await pickLedger(page, 0);
    await amounts(page).first().fill('1500');
    await pickByName(page, 'Collection type');
    // Naration
    await page.getByLabel('Remarks').fill('Test general receipt');
    await page.getByLabel('Phone number').fill('9876543210');
    await page.getByLabel('Paid by (name)').fill('Test Person');
    await clickSubmit(page, 'Receipt Generation');
    await expectVoucherSuccess(page);
  });

  test('Journal voucher — form fills and generates JV', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    // App has intentional typo "Jounral vocher" in the menu item
    await openFormViaAdd(page, 'Jounral vocher', 'Journal voucher information');
    // JV page only renders a "Debit information" heading ("Credit information"
    // exists solely as a hidden <option>)
    await expect(page.getByRole('heading', { name: /debit information/i }).first()).toBeVisible({ timeout: 10000 });
    await fillBranches(page);
    // App's inconsistent casing: ".../Name" on credit, ".../name" on debit
    await pickLedger(page, 0);
    await amounts(page).nth(0).fill('2000');
    await pickLedger(page, 1);
    await amounts(page).nth(1).fill('2000');
    // Remarks
    await page.getByLabel('Remarks').fill('Test journal voucher');
    await clickSubmit(page, 'Generate JV');
    await expectVoucherSuccess(page);
  });

  test('Contra voucher — form fills and generates contra voucher', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await openFormViaAdd(page, 'Contra Voucher', 'Contra voucher information');
    await page.getByRole('radio', { name: 'Bank' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('radio', { name: 'Bank' }).click();
    await page.waitForTimeout(500);
    // Bank mode leaves the Branch comboboxes empty
    await fillBranches(page);
    await pickLedger(page, 0);
    await amounts(page).nth(0).fill('3000');
    await pickLedger(page, 1);
    await amounts(page).nth(1).fill('3000');
    // Remarks
    await page.getByLabel('Remarks').fill('Test contra voucher');
    await clickSubmit(page, 'Generate Contra voucher');
    await expectVoucherSuccess(page);
  });
});
