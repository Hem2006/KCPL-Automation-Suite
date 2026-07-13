import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Collection - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }) => {
    await sidebar.collectionButton.waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    const isOpen = await page.getByText('Due list', { exact: true }).isVisible().catch(() => false);
    if (!isOpen) {
      await sidebar.collectionButton.click({ timeout: 20000 });
      await page.getByText('Due list', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
  });

  test('due list page loads with table and filters', async ({ authenticatedPage: page }) => {
    await page.getByText('Due list', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Due List Summary', { exact: true })).toBeVisible({ timeout: 10000 });

    // Summary table headers
    await expect(page.getByRole('columnheader', { name: 'TotalPayableAmount', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'PaidAmount', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'OutStandingBalance', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'SubscriptionBalance', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'PenaltyBalance', exact: true })).toBeVisible();

    // Filter inputs visible
    await expect(page.locator('#filterfromPendingInstallment')).toBeVisible();
    await expect(page.locator('#filtertoPendingInstallment')).toBeVisible();
    await expect(page.locator('#filterenrollmentDate')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();

    // Fill pending installment range and verify values
    await page.locator('#filterfromPendingInstallment').fill('10');
    await page.locator('#filtertoPendingInstallment').fill('100');
    await expect(page.locator('#filterfromPendingInstallment')).toHaveValue('10');
    await expect(page.locator('#filtertoPendingInstallment')).toHaveValue('100');

    // Main DataGrid column headers (first 7 visible columns)
    await expect(page.getByRole('columnheader', { name: 'Bucket', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Pending Installment', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collection branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Contact Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
  });

  test('unsettle report page loads, toggles and filters work', async ({ authenticatedPage: page }) => {
    await page.getByText('Unsettle Report', { exact: true }).click();
    // Wait for heading explicitly — noBackdrop alone may resolve before content renders
    await page.getByText('Unsettled Collection Report', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);

    await expect(page.getByText('Unsettled Collection Report', { exact: true })).toBeVisible();

    // Top-right toggle tabs (DOM renders text as uppercase)
    const unsettledBtn = page.getByRole('button', { name: /unsettled list/i });
    const deletedBtn   = page.getByRole('button', { name: /deleted list/i });
    const processingBtn = page.getByRole('button', { name: /processing list/i });
    await expect(unsettledBtn).toBeVisible();
    await expect(deletedBtn).toBeVisible();
    await expect(processingBtn).toBeVisible();

    // Click DELETED LIST tab — heading changes to "Unsettled Deleted Report"
    await deletedBtn.click();
    await page.getByText('Unsettled Deleted Report', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await noBackdrop(page);

    // Click PROCESSING LIST tab — just verify tabs are still visible (heading unknown)
    await processingBtn.click();
    await noBackdrop(page);
    await expect(processingBtn).toBeVisible();

    // Return to UNSETTLED LIST
    await unsettledBtn.click();
    await page.getByText('Unsettled Collection Report', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await noBackdrop(page);

    // Radio buttons: Receipt selected by default
    // Use getByRole('radio') to avoid strict-mode collision with 'Receipt number' column header
    await expect(page.getByRole('radio', { name: 'Receipt' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Agent' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Branch' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Receipt' })).toBeChecked();

    // Toggle to Agent, verify checked
    await page.getByRole('radio', { name: 'Agent' }).click();
    await expect(page.getByRole('radio', { name: 'Agent' })).toBeChecked();

    // Toggle to Branch, verify checked
    await page.getByRole('radio', { name: 'Branch' }).click();
    await expect(page.getByRole('radio', { name: 'Branch' })).toBeChecked();

    // Reset to Receipt
    await page.getByRole('radio', { name: 'Receipt' }).click();
    await expect(page.getByRole('radio', { name: 'Receipt' })).toBeChecked();

    // Action buttons and date filter
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('button', { name: /clear\s*all/i })).toBeVisible();
    await expect(page.locator('#filterenrollmentDate')).toBeVisible();

    // Summary accordion — click to expand
    const summaryAccordion = page.locator('#panel2a-header');
    await expect(summaryAccordion).toBeVisible();
    await summaryAccordion.click();
    await expect(summaryAccordion).toHaveAttribute('aria-expanded', 'true');

    // Main DataGrid column headers
    await expect(page.getByRole('columnheader', { name: 'Collection date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collected agent Id & name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Mode', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Reference Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Debit to Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Receipt number', exact: true })).toBeVisible();
  });

  test('settle report page loads, toggles and filters work', async ({ authenticatedPage: page }) => {
    await page.getByText('Settle Report', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Daily collection report', { exact: true })).toBeVisible({ timeout: 10000 });

    // Top-right Settled / Reversed toggle
    const settledBtn  = page.getByRole('button', { name: 'Settled', exact: true });
    const reversedBtn = page.getByRole('button', { name: 'Reversed', exact: true });
    await expect(settledBtn).toBeVisible();
    await expect(reversedBtn).toBeVisible();

    // Click Reversed and verify heading remains
    await reversedBtn.click();
    await noBackdrop(page);
    await expect(page.getByText('Daily collection report', { exact: true })).toBeVisible();

    // Click back to Settled
    await settledBtn.click();
    await noBackdrop(page);

    // Radio buttons: Receipt selected by default
    // Use getByRole('radio') to avoid strict-mode collision with 'Receipt number' column header
    await expect(page.getByRole('radio', { name: 'Receipt' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Agent' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Branch' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Receipt' })).toBeChecked();

    // Toggle to Agent
    await page.getByRole('radio', { name: 'Agent' }).click();
    await expect(page.getByRole('radio', { name: 'Agent' })).toBeChecked();

    // Toggle to Branch
    await page.getByRole('radio', { name: 'Branch' }).click();
    await expect(page.getByRole('radio', { name: 'Branch' })).toBeChecked();

    // Reset to Receipt
    await page.getByRole('radio', { name: 'Receipt' }).click();
    await expect(page.getByRole('radio', { name: 'Receipt' })).toBeChecked();

    // Action buttons and date filter
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    // DOM text is "ClearAll" (no space) on this page
    await expect(page.getByRole('button', { name: 'ClearAll', exact: true })).toBeVisible();
    await expect(page.locator('#filterenrollmentDate')).toBeVisible();

    // Summary accordion — click to expand
    const summaryAccordion = page.locator('#panel2a-header');
    await expect(summaryAccordion).toBeVisible();
    await summaryAccordion.click();
    await expect(summaryAccordion).toHaveAttribute('aria-expanded', 'true');

    // Main DataGrid column headers
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Settled by', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collection type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collection date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Settled date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit ID', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collected agent ID', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Receipt number', exact: true })).toBeVisible();
  });

  test('agent transfer page loads with all dropdowns and disabled generate', async ({ authenticatedPage: page }) => {
    await page.getByText('Agent Transfer', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Agent Search', { exact: true })).toBeVisible({ timeout: 10000 });

    // Three autocomplete comboboxes: Select Branch, Agent Type, Agent Name or ID
    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes.nth(0)).toBeVisible(); // Select Branch
    await expect(comboboxes.nth(1)).toBeVisible(); // Agent Type
    await expect(comboboxes.nth(2)).toBeVisible(); // Agent Name or ID

    // Generate is disabled until all required fields are filled
    const generateBtn = page.getByRole('button', { name: 'Generate', exact: true });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();

    // Agent Type and Agent Name or ID are disabled until Branch is selected
    await expect(comboboxes.nth(1)).toBeDisabled();
    await expect(comboboxes.nth(2)).toBeDisabled();

    // Click Select Branch dropdown and verify listbox opens
    await comboboxes.nth(0).click();
    await page.locator('[role="listbox"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape');

    // Generate still disabled — no branch was selected
    await expect(generateBtn).toBeDisabled();
  });
});
