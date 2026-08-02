import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Receipt - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Receipt', [['', 'Receipt']]);
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await sidebar.receiptLink.click();
    await page.getByTestId('receipt-generation-lable').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
  });

  test('receipt page loads with form fields', async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/Receipt Date/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add New' })).toBeVisible();
    await expect(page.getByLabel('Phone number')).toBeVisible();
    await expect(page.getByLabel('Group / ticket no')).toBeVisible();
    await expect(page.getByText('Due Amount')).toBeVisible();
    await expect(page.getByText('Total Amount')).toBeVisible();
  });

  test('receipt form — text fields accept input', async ({ authenticatedPage: page }) => {
    const phoneField = page.getByLabel('Phone number');
    const amountField = page.getByLabel('Amount');

    await phoneField.fill('9876543210');
    await expect(phoneField).toHaveValue('9876543210');

    await amountField.fill('5000');
    await expect(amountField).toHaveValue('5000');
  });

  test('receipt form — fills form and generates receipt', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.getByLabel('Phone number').fill('8147115850');

    const groupField = page.getByLabel('Group / ticket no');
    await groupField.click();
    await page.getByRole('option').first().click();

    await page.getByLabel('Amount').fill('500');
    await page.getByLabel('Narration').fill('Automated smoke test receipt');

    await page.getByRole('button', { name: 'Receipt Generation' }).click();

    await expect(page.getByText('Receipt Created Successfully')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Receipt no/)).toBeVisible();
  });
});
