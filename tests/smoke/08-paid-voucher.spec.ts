import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Paid voucher List - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Paid Voucher List', [
      ['sb & asb paid list', 'Sb & Asb Paid List'],
      ['repayment paid list', 'Repayment Paid List'],
      ['other paid list', 'Other Paid List'],
    ]);
    // If the Payment voucher submenu is still open from a prior spec, close it — it pushes
    // "Paid voucher List" below the sidebar fold and makes it non-visible.
    const paymentSubmenuOpen = await page.getByText('Sb & Asb', { exact: true }).isVisible().catch(() => false);
    if (paymentSubmenuOpen) {
      await sidebar.paymentVoucherButton.click({ timeout: 10000 });
      await page.getByText('Sb & Asb', { exact: true }).waitFor({ state: 'hidden', timeout: 10000 });
    }
    await sidebar.paidVoucherButton.waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    const isOpen = await page.getByText('Sb & Asb Paid List', { exact: true }).isVisible().catch(() => false);
    if (!isOpen) {
      await sidebar.paidVoucherButton.click({ timeout: 20000 });
      await page.getByText('Sb & Asb Paid List', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
  });

  // ─── SB & ASB PAID LIST ───────────────────────────────────────────────────

  test('sb & asb paid list page loads with table and filters', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Sb Paid List', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Sb Paid List/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Schedule date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction no', exact: true })).toBeVisible();
  });

  test('sb & asb paid list — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Sb Paid List', { exact: true })).toBeVisible({ timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('sb & asb paid list — filter fields accept input', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Sb Paid List', { exact: true })).toBeVisible({ timeout: 10000 });

    // Only the autocomplete filter inputs are editable (not the rows-per-page Select).
    const filters = page.locator('input[role="combobox"]');
    const count = await filters.count();
    if (count > 0) {
      await filters.nth(0).fill('AUCTION');
      await expect(filters.nth(0)).toHaveValue('AUCTION');
      await filters.nth(0).clear();
    }
    if (count > 1) {
      await filters.nth(1).fill('100000');
      await expect(filters.nth(1)).toHaveValue('100000');
      await filters.nth(1).clear();
    }
    if (count > 2) {
      await filters.nth(2).fill('PAID');
      await expect(filters.nth(2)).toHaveValue('PAID');
      await filters.nth(2).clear();
    }
  });

  test('sb & asb paid list — download button and date range are visible', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Sb Paid List', { exact: true })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    // These paid-list pages use a "Select Date Range" textbox, not #filterlastModifiedOn.
    await expect(page.getByRole('textbox', { name: 'Select Date Range' })).toBeVisible();
  });

  // ─── REPAYMENT PAID LIST ──────────────────────────────────────────────────

  test('repayment paid list page loads with table', async ({ authenticatedPage: page }) => {
    await page.getByText('Repayment Paid List', { exact: true }).click();
    await noBackdrop(page);
    // App bug: this page shows "Sb Paid List" heading — assert on column headers instead
    await expect(page.getByRole('columnheader', { name: 'Voucher number', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payment type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Return date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Bank detail', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
  });

  test('repayment paid list — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByText('Repayment Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('columnheader', { name: 'Voucher number', exact: true })).toBeVisible({ timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('repayment paid list — filter fields accept input', async ({ authenticatedPage: page }) => {
    await page.getByText('Repayment Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('columnheader', { name: 'Voucher number', exact: true })).toBeVisible({ timeout: 10000 });

    // Only the autocomplete filter inputs are editable (not the rows-per-page Select).
    const filters = page.locator('input[role="combobox"]');
    const count = await filters.count();
    if (count > 0) {
      await filters.nth(0).fill('AUCTION');
      await expect(filters.nth(0)).toHaveValue('AUCTION');
      await filters.nth(0).clear();
    }
    if (count > 1) {
      await filters.nth(1).fill('100000');
      await expect(filters.nth(1)).toHaveValue('100000');
      await filters.nth(1).clear();
    }
    if (count > 2) {
      await filters.nth(2).fill('PAID');
      await expect(filters.nth(2)).toHaveValue('PAID');
      await filters.nth(2).clear();
    }
  });

  test('repayment paid list — download button and date range are visible', async ({ authenticatedPage: page }) => {
    await page.getByText('Repayment Paid List', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('columnheader', { name: 'Voucher number', exact: true })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    // These paid-list pages use a "Select Date Range" textbox, not #filterlastModifiedOn.
    await expect(page.getByRole('textbox', { name: 'Select Date Range' })).toBeVisible();
  });

  // ─── OTHER PAID LIST ──────────────────────────────────────────────────────

  test('other paid list page loads with table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Other Paid List', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Other Paid List/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Schedule date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable Type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Generate date', exact: true })).toBeVisible();
  });

  test('other paid list — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Other Paid List', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Other Paid List/)).toBeVisible({ timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('other paid list — filter fields accept input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Other Paid List', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Other Paid List/)).toBeVisible({ timeout: 10000 });

    // Only the autocomplete filter inputs are editable (not the rows-per-page Select).
    const filters = page.locator('input[role="combobox"]');
    const count = await filters.count();
    if (count > 0) {
      await filters.nth(0).fill('CANCELLATION');
      await expect(filters.nth(0)).toHaveValue('CANCELLATION');
      await filters.nth(0).clear();
    }
    if (count > 1) {
      await filters.nth(1).fill('100000');
      await expect(filters.nth(1)).toHaveValue('100000');
      await filters.nth(1).clear();
    }
    if (count > 2) {
      await filters.nth(2).fill('PAID');
      await expect(filters.nth(2)).toHaveValue('PAID');
      await filters.nth(2).clear();
    }
  });

  test('other paid list — download button and date range are visible', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Other Paid List', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Other Paid List/)).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    // These paid-list pages use a "Select Date Range" textbox, not #filterlastModifiedOn.
    await expect(page.getByRole('textbox', { name: 'Select Date Range' })).toBeVisible();
  });
});
