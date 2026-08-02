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
});
