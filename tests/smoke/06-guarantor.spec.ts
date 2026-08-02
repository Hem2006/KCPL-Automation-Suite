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

// The New Document Dept Entry form sits close enough to the sidebar that a normal
// click on some Autocomplete fields is intercepted by the sidebar panel — same
// class of issue as the NPS/SB/ASB/Others radios below, worked around the same way.
const selectAutocomplete = async (page: Page, label: string, optionName: string) => {
  await page.getByLabel(label).dispatchEvent('mousedown');
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

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

  test('add guarantor — all radio buttons switch the view', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
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

  test('add guarantor — Add New Guarantor fills form and saves', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    // Known app bug: Save on the New Document Dept Entry form does not redirect or
    // persist, even with every field filled correctly via real Playwright interaction
    // (confirmed independently of any test-authoring workaround). Remove test.fail()
    // once the app is fixed — the assertions below already encode real success.
    test.fail();
    await page.getByText('Add guarantor', { exact: true }).click();
    await noBackdrop(page);
    await page.getByText('Upload document').waitFor({ state: 'visible', timeout: 10000 });

    // Open the first pending record's detail page to add a guarantor against it.
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.MuiDataGrid-row').first().locator('.MuiDataGrid-cell[data-colindex="1"]').click();
    await page.getByRole('button', { name: 'Add Guarantor' }).waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add Guarantor' }).click();
    const guarantorPhone = '99' + Date.now().toString().slice(-8);
    await page.getByPlaceholder('+91 9000000000').fill(guarantorPhone);
    await page.getByLabel('Name').click();
    await page.getByRole('option', { name: 'Add New Guarantor' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('option', { name: 'Add New Guarantor' }).click();
    await page.getByRole('button', { name: 'Add Guarantor' }).click();

    // "New Document Dept Entry" form — same layout as the Dashboard's New Member form.
    await page.getByLabel('Aadhar Card No').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByLabel('Aadhar Card No').fill('345678901234');
    await page.getByLabel('Name', { exact: true }).first().fill('Guarantor Test Person');
    await page.getByLabel('Name', { exact: true }).nth(1).fill('Guarantor Test Father');

    await selectAutocomplete(page, 'Gender', 'Male');
    await page.getByLabel('Date of Birth').fill('10/03/1985');
    await selectAutocomplete(page, 'Created branch', 'CORP_OFFICE');
    await selectAutocomplete(page, 'Occupation', 'Employee');
    await page.getByLabel('Annual Income').fill('400000');

    await page.getByLabel('Res.Door No.').fill('45B');
    await page.getByLabel('Land mark').fill('Near Test Circle');
    await page.getByLabel('Address', { exact: true }).fill('456 Guarantor Street');
    await page.getByLabel('Pin Code').fill('560010');
    await page.getByLabel('City').fill('Bengaluru');
    await page.getByLabel('District').fill('Bengaluru Urban');
    await page.getByLabel('State').fill('Karnataka');
    await page.getByLabel('Country').fill('India');

    await selectAutocomplete(page, 'Type of employment', 'Private');
    await page.getByLabel('Department or company name').fill('Guarantor Test Company');
    await page.getByLabel('Designation').fill('Manager');
    await page.getByLabel('Ctc').fill('500000');
    await page.getByLabel('Net Salary').fill('38000');

    const fileInputs = page.locator('input[type="file"]');
    const fileCount = await fileInputs.count();
    for (let i = 0; i < fileCount; i++) {
      await fileInputs.nth(i).setInputFiles('tests/assets/test-image.png').catch(() => {});
    }

    await page.getByTestId('Save-color-Icon').click();
    // Save redirects back to the record's guarantor summary page.
    await page.getByRole('button', { name: 'Add Guarantor' }).waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByText('Surety information')).toBeVisible();
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

  test('aprove guarantor — all radio buttons switch the view', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
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

  test('secondary approval — all radio buttons switch the view', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
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
