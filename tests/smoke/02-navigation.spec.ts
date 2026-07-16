import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

test.describe('Sidebar Navigation - Smoke @smoke', () => {
  test.beforeEach(async ({}, testInfo) => {
    await tagAllure(testInfo, 'Sidebar Navigation', [['', 'Navigation']]);
  });

  test('all sidebar nav items are visible', async ({ sidebar }) => {
    for (const item of sidebar.allNavItems()) {
      await expect(item).toBeVisible();
    }
  });

  test('dashboard link navigates to dashboard', async ({ authenticatedPage, sidebar }) => {
    await sidebar.dashboardLink.click();
    await expect(authenticatedPage).toHaveURL(/#\/dashboard/);
  });

  test('receipt link navigates to receipt page', async ({ authenticatedPage, sidebar }) => {
    await sidebar.receiptLink.click();
    await authenticatedPage.waitForURL(/#\/dashboard\/directReciept/);
    await expect(authenticatedPage).toHaveURL(/#\/dashboard\/directReciept/);
  });

  test('logout flow works', async ({ authenticatedPage: page }) => {
    await page.locator('[data-testid="Avat-ar"]').click();
    await page.getByText('Logout', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'No' }).click();
  });
});
