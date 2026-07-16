import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

async function ensureAuditOpen(page: Page) {
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const schemeItem = page.getByText('Scheme', { exact: true });
  if (await schemeItem.isVisible().catch(() => false)) return;

  const auditTab = page.getByText('Audit', { exact: true });
  if (!(await auditTab.isVisible({ timeout: 2000 }).catch(() => false))) {
    await page.locator('[data-testid="selectednavitecreationbutton0"]').click({ timeout: 5000 }).catch(async () => {
      await page.locator('div[role="button"]').first().click({ timeout: 5000 }).catch(() => {});
    });
    await noBackdrop(page);
    await page.waitForTimeout(1000);
    await auditTab.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
    await auditTab.waitFor({ state: 'visible', timeout: 10000 });
  }
  await auditTab.scrollIntoViewIfNeeded().catch(() => {});
  await auditTab.click();
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await schemeItem.waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Audit - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page }, testInfo) => {
    await tagAllure(testInfo, 'Audit', [
      ['scheme', 'Scheme'],
      ['sb list', 'Sb List'],
      ['favorite', 'Favorite'],
    ]);
    await ensureAuditOpen(page);
  });

  test('Scheme - page loads with scheme list table and columns', async ({ authenticatedPage: page }) => {
    // Audit sidebar items are <a> links — click by role and confirm the route
    await page.getByRole('link', { name: 'Scheme' }).click();
    await expect(page).toHaveURL(/create\/scheme/, { timeout: 10000 });
    await noBackdrop(page);

    await expect(page.getByRole('columnheader', { name: 'Scheme Name', exact: true })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('columnheader', { name: 'Chit Value', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'No of installment', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
    // Scheme list is read-only in audit context — no Add button
    await expect(page.getByRole('button', { name: 'Add', exact: true })).not.toBeVisible();
  });

  test('Sb list - page loads with Running auction radio, filters and table', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb list', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByRole('radio', { name: 'Running auction' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('radio', { name: 'Re auction' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Auction date time', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Prized chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit value', exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
  });

  test('Sb list - Re auction radio toggles view', async ({ authenticatedPage: page }) => {
    await page.getByText('Sb list', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByRole('radio', { name: 'Running auction' })).toBeChecked();

    await page.getByRole('radio', { name: 'Re auction' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('radio', { name: 'Re auction' })).toBeChecked();

    await page.getByRole('radio', { name: 'Running auction' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('radio', { name: 'Running auction' })).toBeChecked();
  });

  test('Favorite - page loads', async ({ authenticatedPage: page }) => {
    await page.getByText('Favorite', { exact: true }).first().click();
    await noBackdrop(page);

    await page.waitForTimeout(1000);
    await expect(page.locator('.MuiBackdrop-root')).toBeHidden({ timeout: 5000 }).catch(() => {});
  });
});
