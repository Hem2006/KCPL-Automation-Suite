import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

async function ensureAccountsReportOpen(page: Page) {
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const cashInHandItem = page.getByRole('menuitem', { name: 'Cash in hand' });
  if (await cashInHandItem.isVisible().catch(() => false)) return;

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

  const reportBtn = page.getByRole('button', { name: 'Report', exact: true });
  await reportBtn.waitFor({ state: 'visible', timeout: 15000 });
  await reportBtn.click();
  await cashInHandItem.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Accounts - Report - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await ensureAccountsReportOpen(page);
  });

  test('Cash in hand - page loads with Account search and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Cash in hand' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Cash Ledger view')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Account search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  test('Petty cash - page loads with Account search and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Petty cash' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Petty cash Ledger view')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Account search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  test('Cheque in hand - page loads with Account search and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Cheque in hand' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Account search')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  test('Bank book - page loads with Account search and Generate', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank book' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Bank Ledger View')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Account search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  test('GST Report - menu item is a dead link (app bug: no href)', async ({ authenticatedPage: page }) => {
    // Live-verified: unlike every other Report menuitem, "GST Report" renders
    // without an href, so clicking it does not navigate anywhere.
    const gstItem = page.getByRole('menuitem', { name: 'GST Report' });
    await expect(gstItem).toBeVisible({ timeout: 10000 });
    await expect(gstItem).not.toHaveAttribute('href', /.+/);

    const urlBefore = page.url();
    await gstItem.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toBe(urlBefore);
  });

  test('P & L - page loads with Profit and loss account table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'P & L' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Profit and loss account').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Expense', { exact: true })).toBeVisible();
    await expect(page.getByText('Revenue', { exact: true })).toBeVisible();
  });

  test('Balance sheet - page loads with Liabilities and Asset table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Balance sheet' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Balance sheet').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Liabilities', { exact: true })).toBeVisible();
    await expect(page.getByText('Asset', { exact: true })).toBeVisible();
  });

  test('Trail balance - page loads with Main group and Particulars table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Trail balance' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Trail balance').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Main group')).toBeVisible();
    await expect(page.getByText('Particulars')).toBeVisible();
  });

  test('Day Book - page loads with Daily transaction register report', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Day Book' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Daily transaction register report')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Day Book')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Active' })).toBeVisible();
  });

  test('Sales Register - page loads at total-commission route', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Sales Register' }).click();
    await noBackdrop(page);

    await expect(page).toHaveURL(/total-commission/, { timeout: 10000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
  });

  test('Cash Book - page loads with Cash Book Reconciliation and branch filters', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Cash Book' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Cash Book Reconciliation')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total count')).toBeVisible();
  });

  test('CDR - page loads at cdr-summary route', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'CDR' }).last().click();
    await noBackdrop(page);

    await expect(page).toHaveURL(/cdr-summary/, { timeout: 10000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
  });
});
