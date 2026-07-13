import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Receipt - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }) => {
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
});
