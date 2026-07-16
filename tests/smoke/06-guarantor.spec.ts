import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

const openDropdown = (page: Page, label: string) =>
  page.locator('.MuiFormControl-root').filter({ hasText: label }).locator('.MuiSelect-select').click();

test.describe('Guarantor details - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Guarantor Details', [
      ['add guarantor', 'Add Guarantor'],
      ['aprove guarantor', 'Aprove Guarantor'],
      ['secondary approval', 'Secondary Approval'],
    ]);
    await sidebar.guarantorButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    const isOpen = await page.getByText('Add guarantor', { exact: true }).isVisible().catch(() => false);
    if (!isOpen) {
      await sidebar.guarantorButton.click({ timeout: 20000 });
      await page.getByText('Add guarantor', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
  });

  // ─── ADD GUARANTOR ────────────────────────────────────────────────────────

  test('add guarantor page loads with heading and table', async ({ authenticatedPage: page }) => {
    await page.getByText('Add guarantor', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Upload document')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total count/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Generated date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable type', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('add guarantor — all radio buttons switch the view', async ({ authenticatedPage: page }) => {
    await page.getByText('Add guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Upload document').waitFor({ state: 'visible', timeout: 10000 });

    for (const label of ['NPS', 'SB/ASB', 'Others']) {
      // The open sidebar submenu panel overlaps the radio group, so a normal click is
      // intercepted — dispatch the click straight onto the radio input instead.
      const radio = page.locator('.MuiFormControlLabel-root').filter({ hasText: label })
        .locator('input[type="radio"]');
      await radio.dispatchEvent('click');
      await expect(radio).toBeChecked({ timeout: 5000 });
      await noBackdrop(page);
    }
  });

  test('add guarantor — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByText('Add guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Upload document').waitFor({ state: 'visible', timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('add guarantor — filter dropdowns open', async ({ authenticatedPage: page }) => {
    await page.getByText('Add guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Upload document').waitFor({ state: 'visible', timeout: 10000 });

    await openDropdown(page, 'Service-Branch');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    await openDropdown(page, 'Status');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    await openDropdown(page, 'ChitValue');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');
  });

  test('add guarantor — date range and download button are visible', async ({ authenticatedPage: page }) => {
    await page.getByText('Add guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Upload document').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#date')).toBeVisible();
    await expect(page.locator('button:has([data-testid="DownloadRoundedIcon"])')).toBeVisible();
  });

  // ─── APROVE GUARANTOR ─────────────────────────────────────────────────────

  test('aprove guarantor page loads with heading and table', async ({ authenticatedPage: page }) => {
    await page.getByText('Aprove guarantor', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Approve document')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total count/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable type', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('aprove guarantor — all radio buttons switch the view', async ({ authenticatedPage: page }) => {
    await page.getByText('Aprove guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Approve document').waitFor({ state: 'visible', timeout: 10000 });

    for (const label of ['NPS', 'SB/ASB', 'Others']) {
      // The open sidebar submenu panel overlaps the radio group, so a normal click is
      // intercepted — dispatch the click straight onto the radio input instead.
      const radio = page.locator('.MuiFormControlLabel-root').filter({ hasText: label })
        .locator('input[type="radio"]');
      await radio.dispatchEvent('click');
      await expect(radio).toBeChecked({ timeout: 5000 });
      await noBackdrop(page);
    }
  });

  test('aprove guarantor — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByText('Aprove guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Approve document').waitFor({ state: 'visible', timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('aprove guarantor — filter dropdowns open', async ({ authenticatedPage: page }) => {
    await page.getByText('Aprove guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Approve document').waitFor({ state: 'visible', timeout: 10000 });

    await openDropdown(page, 'Service-Branch');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    await openDropdown(page, 'Status');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    await openDropdown(page, 'ChitValue');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');
  });

  test('aprove guarantor — date range and download button are visible', async ({ authenticatedPage: page }) => {
    await page.getByText('Aprove guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Approve document').waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#date')).toBeVisible();
    await expect(page.locator('button:has([data-testid="DownloadRoundedIcon"])')).toBeVisible();
  });

  // ─── SECONDARY APPROVAL ───────────────────────────────────────────────────

  test('secondary approval page loads with heading and table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Secondary Approval', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Secondary Approval').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total count/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payable type', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('secondary approval — all radio buttons switch the view', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Secondary Approval', exact: true }).click();
    await noBackdrop(page);
    await page.getByText(/Total count/).waitFor({ state: 'visible', timeout: 10000 });

    for (const label of ['NPS', 'SB/ASB', 'Others']) {
      // The open sidebar submenu panel overlaps the radio group, so a normal click is
      // intercepted — dispatch the click straight onto the radio input instead.
      const radio = page.locator('.MuiFormControlLabel-root').filter({ hasText: label })
        .locator('input[type="radio"]');
      await radio.dispatchEvent('click');
      await expect(radio).toBeChecked({ timeout: 5000 });
      await noBackdrop(page);
    }
  });

  test('secondary approval — search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Secondary Approval', exact: true }).click();
    await noBackdrop(page);
    await page.getByText(/Total count/).waitFor({ state: 'visible', timeout: 10000 });

    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('TEST');
    await expect(search).toHaveValue('TEST');
    await search.clear();
    await expect(search).toHaveValue('');
  });

  test('secondary approval — filter dropdowns open', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Secondary Approval', exact: true }).click();
    await noBackdrop(page);
    await page.getByText(/Total count/).waitFor({ state: 'visible', timeout: 10000 });

    await openDropdown(page, 'Service-Branch');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    await openDropdown(page, 'Status');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    await openDropdown(page, 'ChitValue');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');
  });

  test('secondary approval — date range and download button are visible', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Secondary Approval', exact: true }).click();
    await noBackdrop(page);
    await page.getByText(/Total count/).waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('#date')).toBeVisible();
    await expect(page.locator('button:has([data-testid="DownloadRoundedIcon"])')).toBeVisible();
  });
});
