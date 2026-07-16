import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Payment voucher - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Payment Voucher', [
      ['sb & asb', 'Sb & Asb'],
      ['repayment', 'Repayment'],
      ['other payment', 'Other'],
    ]);
    await sidebar.paymentVoucherButton.waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    const isOpen = await page.getByText('Sb & Asb', { exact: true }).isVisible().catch(() => false);
    if (!isOpen) {
      await sidebar.paymentVoucherButton.click({ timeout: 20000 });
      await page.getByText('Sb & Asb', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
  });

  // ─── SB & ASB ─────────────────────────────────────────────────────────────

  test('sb & asb page loads with heading and table', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Sb payable list')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Sb payable/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Schedule date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable Type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('sb & asb — tab buttons switch between all three views', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Sb payable list').waitFor({ state: 'visible', timeout: 10000 });

    await page.getByRole('button', { name: 'Other Payment' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Other payable list')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Repayment' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Repayment list')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Sb payable' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Sb payable list')).toBeVisible({ timeout: 10000 });
  });

  test('sb & asb — Subscriber and Company radio buttons switch view', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Sb payable list').waitFor({ state: 'visible', timeout: 10000 });

    await page.getByText('Company', { exact: true }).click();
    await expect(page.locator('input[name="paymentMode"]').nth(1)).toBeChecked({ timeout: 5000 });
    await expect(page.getByText(/Total Sb payable/)).toBeVisible({ timeout: 10000 });

    await page.getByText('Subscriber', { exact: true }).click();
    await expect(page.locator('input[name="paymentMode"]').nth(0)).toBeChecked({ timeout: 5000 });
    await expect(page.getByText(/Total Sb payable/)).toBeVisible({ timeout: 10000 });
  });

  test('sb & asb — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Sb payable list').waitFor({ state: 'visible', timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('sb & asb — filter fields accept input', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Sb payable list').waitFor({ state: 'visible', timeout: 10000 });

    // Only the autocomplete filter inputs are editable; the rows-per-page control is a
    // MUI Select (a non-editable <div role="combobox">), so scope to <input> comboboxes.
    const filters = page.locator('input[role="combobox"]');

    await filters.nth(0).fill('AUCTION');
    await expect(filters.nth(0)).toHaveValue('AUCTION');
    await filters.nth(0).clear();

    await filters.nth(1).fill('100000');
    await expect(filters.nth(1)).toHaveValue('100000');
    await filters.nth(1).clear();
  });

  test('sb & asb — download buttons and date range are visible', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb & Asb', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Sb payable list').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#download')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.locator('#filterlastModifiedOn')).toBeVisible();
  });

  // ─── REPAYMENT ────────────────────────────────────────────────────────────

  test('repayment page loads with heading and table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Repayment', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Repayment list')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Repayment/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payment type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Voucher number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Return date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Bank detail', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('repayment — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Repayment', exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Repayment list').waitFor({ state: 'visible', timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('repayment — filter fields accept input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Repayment', exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Repayment list').waitFor({ state: 'visible', timeout: 10000 });

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
  });

  test('repayment — download buttons and date range are visible', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Repayment', exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Repayment list').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#download')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.locator('#filterlastModifiedOn')).toBeVisible();
  });

  // ─── OTHER PAYMENT ────────────────────────────────────────────────────────

  test('other payment page loads with heading and table', async ({ authenticatedPage: page }) => {
    await page.getByText('Other', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Other payable list')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Other payable/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Schedule date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable Type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('other payment — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByText('Other', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Other payable list').waitFor({ state: 'visible', timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('other payment — filter fields accept input', async ({ authenticatedPage: page }) => {
    await page.getByText('Other', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Other payable list').waitFor({ state: 'visible', timeout: 10000 });

    const filters = page.getByRole('combobox');

    await filters.nth(0).fill('CANCELLATION');
    await expect(filters.nth(0)).toHaveValue('CANCELLATION');
    await filters.nth(0).clear();

    await filters.nth(1).fill('100000');
    await expect(filters.nth(1)).toHaveValue('100000');
    await filters.nth(1).clear();

    await filters.nth(2).fill('PAID');
    await expect(filters.nth(2)).toHaveValue('PAID');
    await filters.nth(2).clear();
  });

  test('other payment — download buttons and date range are visible', async ({ authenticatedPage: page }) => {
    await page.getByText('Other', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Other payable list').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#download')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.locator('#filterlastModifiedOn')).toBeVisible();
  });
});
