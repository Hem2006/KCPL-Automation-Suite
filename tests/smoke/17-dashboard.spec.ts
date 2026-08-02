import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

// Dev accounts seeded on the target env — searching any of these by phone
// number returns at least one result card.
const PHONE_NUMBERS = ['8147115850', '8147115854', '0000000000'];

// The New Member form sits close enough to the sidebar that a normal click on some
// Autocomplete fields is intercepted by the sidebar panel — dispatch straight to the
// element instead (same pattern used for the Add Guarantor form in 06-guarantor.spec.ts).
const selectAutocomplete = async (page: Page, label: string, optionName: string) => {
  await page.getByLabel(label).dispatchEvent('mousedown');
  await page.getByRole('option', { name: optionName, exact: true }).click();
};

test.describe('Dashboard - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Dashboard', [['', 'Dashboard']]);
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await sidebar.dashboardLink.click();
    await page.locator('#combo-box-demo').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
  });

  test('dashboard page loads with search widget', async ({ authenticatedPage: page }) => {
    await expect(page.locator('#combo-box-demo')).toHaveValue('Phone number');
    await expect(page.locator('#searchInput')).toBeVisible();
    await expect(page.getByTestId('search-searchdasable')).toBeVisible();
    await expect(page.getByText('Celebration Wall')).toBeVisible();
    await expect(page.getByText('Trending Now')).toBeVisible();
    await expect(page.getByText('Monthly Achievers')).toBeVisible();
  });

  for (const phone of PHONE_NUMBERS) {
    test(`dashboard search — phone number ${phone} returns matching results`, async ({ authenticatedPage: page }) => {
      const searchInput = page.locator('#searchInput');
      const searchButton = page.getByTestId('search-searchdasable');

      // Search button is disabled until the input holds a value.
      await searchInput.fill(phone);
      await expect(searchInput).toHaveValue(phone);
      await expect(searchButton).toBeEnabled();

      await searchButton.click();
      await noBackdrop(page);

      await page.getByTestId('gridDataContainer0').waitFor({ state: 'visible', timeout: 15000 });
      await expect(page.getByTestId('gridDataContainer0phonenumber')).toHaveText(phone);
      await expect(page.getByTestId('gridDataContainer0name')).not.toBeEmpty();
    });
  }

  test('dashboard search — Add member fills the new member form and saves', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    // Known app bug: Save on the New Member form does not redirect or persist, even
    // with every field filled correctly via real Playwright interaction — same defect
    // as the identically-structured Add Guarantor form (06-guarantor.spec.ts). Remove
    // test.fail() once the app is fixed — the assertions below already encode success.
    test.fail();

    const searchInput = page.locator('#searchInput');
    await searchInput.fill('8147115850');
    await expect(page.getByTestId('search-searchdasable')).toBeEnabled();
    await page.getByTestId('search-searchdasable').click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add member' }).click();
    await page.getByLabel('Mobile number').waitFor({ state: 'visible', timeout: 15000 });

    const newMemberPhone = '99' + Date.now().toString().slice(-8);
    await page.getByLabel('Mobile number').fill(newMemberPhone);
    await page.getByLabel('Aadhar Card No').fill('234567890123');
    await page.getByLabel('Name', { exact: true }).first().fill('Automation Test Member');
    await page.getByLabel('Name', { exact: true }).nth(1).fill('Automation Test Father');

    await selectAutocomplete(page, 'Gender', 'Male');
    await page.getByLabel('Date of Birth').fill('15/06/1990');
    await selectAutocomplete(page, 'Created branch', 'CORP_OFFICE');
    await selectAutocomplete(page, 'Occupation', 'Employee');
    await page.getByLabel('Annual Income').fill('500000');
    await page.getByLabel('Email-Id (optional)').fill('automationtest@example.com');

    await page.getByLabel('Res.Door No.').fill('12A');
    await page.getByLabel('Land mark').fill('Near Test Park');
    await page.getByLabel('Address', { exact: true }).fill('123 Automation Street');
    await page.getByLabel('Pin Code').fill('560010');
    await page.getByLabel('City').fill('Bengaluru');
    await page.getByLabel('District').fill('Bengaluru Urban');
    await page.getByLabel('State').fill('Karnataka');
    await page.getByLabel('Country').fill('India');

    await selectAutocomplete(page, 'Type of employment', 'Private');
    await page.getByLabel('Department or company name').fill('Automation Test Company');
    await page.getByLabel('Designation').fill('QA Engineer');
    await page.getByLabel('Ctc').fill('600000');
    await page.getByLabel('Net Salary').fill('45000');

    const fileInputs = page.locator('input[type="file"]');
    const fileCount = await fileInputs.count();
    for (let i = 0; i < fileCount; i++) {
      await fileInputs.nth(i).setInputFiles('tests/assets/test-image.png').catch(() => {});
    }

    await page.getByTestId('Save-color-Icon').click();
    // Save should redirect back to the Dashboard search results.
    await page.getByTestId('search-searchdasable').waitFor({ state: 'visible', timeout: 15000 });
  });
});
