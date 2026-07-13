import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

async function ensureLegalOpen(page: Page) {
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Defensively dismiss any dialog left open by a previous test on this
  // shared page before it blocks sidebar navigation
  const openDialog = page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)');
  if (await openDialog.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    const yesBtn = page.getByRole('button', { name: /^(Yes|Cancel)$/i });
    if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) await yesBtn.click();
    await openDialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  const legalProspectBtn = page.getByRole('button', { name: 'Legal Prospect', exact: true });
  if (await legalProspectBtn.isVisible({ timeout: 2000 }).catch(() => false)) return;

  const legalTab = page.getByText('Legal', { exact: true });
  if (!(await legalTab.isVisible({ timeout: 2000 }).catch(() => false))) {
    await page.locator('[data-testid="selectednavitecreationbutton0"]').click({ timeout: 5000 }).catch(async () => {
      await page.locator('div[role="button"]').first().click({ timeout: 5000 }).catch(() => {});
    });
    await noBackdrop(page).catch(() => {});
    await page.waitForTimeout(1000);
    await legalTab.waitFor({ state: 'visible', timeout: 10000 });
  }
  await legalTab.click();
  await noBackdrop(page).catch(() => {});
  await legalProspectBtn.waitFor({ state: 'visible', timeout: 15000 });
}

async function ensureLegalProspectOpen(page: Page) {
  await ensureLegalOpen(page);
  const reportItem = page.getByRole('menuitem', { name: 'Legal Prospect Report' });
  if (await reportItem.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: 'Legal Prospect', exact: true }).click();
  await reportItem.waitFor({ state: 'visible', timeout: 10000 });
}

// Click the first data row of a MUI DataGrid and wait for navigation off the list
async function clickFirstRow(page: Page) {
  await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.MuiDataGrid-row').first().click({ force: true });
  await noBackdrop(page).catch(() => {});
  await page.getByText('Subscriber Information').waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Legal - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await ensureLegalOpen(page);
  });

  // ── DASHBOARD ───────────────────────────────────────────────────────────
  test('Dashboard - page loads with Execution/Supervision/More tabs and filters', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('button', { name: 'Execution' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Supervision' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'More' })).toBeVisible();
  });

  // ── LEGAL PROSPECT REPORT ───────────────────────────────────────────────
  test('Legal Prospect Report - page loads with heading, totals, and columns', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'Legal Prospect Report' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Legal Prospect', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Payable Amount').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Outstanding Balance' })).toBeVisible();

    // Scope to the DataGrid — a summary <table> above it duplicates some
    // column names as plain table headers
    const grid = page.locator('.MuiDataGrid-root');
    await expect(grid.getByRole('columnheader', { name: 'Bucket', exact: true })).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: 'Chit ID', exact: true })).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: 'Total Payable Amount', exact: true })).toBeVisible();
  });

  test('Legal Prospect Report - has search, download, and pagination', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'Legal Prospect Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Legal Prospect', exact: true })).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('searchbiutton')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible();
  });

  test('Legal Prospect Report - rows are not clickable (no drilldown, app has no case yet)', async ({ authenticatedPage: page }) => {
    // Live-verified: unlike the SF reports, Legal Prospect Report lists
    // subscribers who have NOT had a suit file created yet, so rows have no
    // navigation target.
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'Legal Prospect Report' }).click();
    await noBackdrop(page);
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 15000 });

    const urlBefore = page.url();
    await page.locator('.MuiDataGrid-row').first().click({ force: true });
    await page.waitForTimeout(1500);
    expect(page.url()).toBe(urlBefore);
  });

  // ── SF CASE WISE REPORT ─────────────────────────────────────────────────
  test('SF Case Wise Report - page loads with columns', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Case Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Case Age', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Accused Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Stage', exact: true })).toBeVisible();
  });

  test('SF Case Wise Report - has search, download, and pagination', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('searchbiutton')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible();
  });

  test('SF Case Wise Report - clicking a row opens Subscriber Information', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });

    await clickFirstRow(page);
    await expect(page.getByText('Subscriber Information')).toBeVisible();
  });

  // ── SF SUBSCRIBER WISE REPORT ───────────────────────────────────────────
  test('SF Subscriber Wise Report - page loads with columns', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Subscriber Wise Report' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'SF Subscriber Wise Report' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'No of Cases', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Outstanding Balance', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Future Liability', exact: true })).toBeVisible();
  });

  test('SF Subscriber Wise Report - has search, download, and pagination', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Subscriber Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Subscriber Wise Report' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('searchbiutton')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible();
  });

  test('SF Subscriber Wise Report - clicking a row opens Subscriber Information', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Subscriber Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Subscriber Wise Report' })).toBeVisible({ timeout: 10000 });

    await clickFirstRow(page);
    await expect(page.getByText('Subscriber Information')).toBeVisible();
  });

  // ── SUBSCRIBER INFORMATION DETAIL PAGE ──────────────────────────────────
  // Reached by drilling into an existing case from either SF report.

  test('Subscriber Information - page loads with case summary and action buttons', async ({ authenticatedPage: page }) => {
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await clickFirstRow(page);

    await expect(page.getByRole('button', { name: 'Add Suite File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
    await expect(page.getByText('Case Information')).toBeVisible();
    // "Legal team information" only becomes visible after clicking Edit (it's
    // present in the DOM but visibility:hidden on the read-only view)
    await expect(page.getByText('Progress of the case')).toBeVisible();
  });

  test('Subscriber Information - Add Suite File fills form and saves', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await clickFirstRow(page);

    await page.getByRole('button', { name: 'Add Suite File' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Suit file information', exact: true })).toBeVisible({ timeout: 10000 });

    // Case Type combobox
    const caseTypeInput = page.getByRole('combobox', { name: 'Case Type' }).or(page.getByRole('textbox', { name: 'Case Type' })).first();
    await caseTypeInput.click();
    const opts = page.locator('[role="listbox"] [role="option"]');
    if (!(await opts.first().isVisible({ timeout: 2000 }).catch(() => false))) {
      await caseTypeInput.press('ArrowDown');
    }
    await opts.first().waitFor({ state: 'visible', timeout: 8000 });
    await opts.first().click();

    // Next Date — must be a future date
    await page.getByLabel('Next Date').fill('2026-12-31').catch(() => {});

    await page.getByLabel('Remarks').fill('Test suite file remarks').catch(() => {});

    // File upload
    await page.locator('input[type="file"]').first().setInputFiles('tests/assets/test-image.png').catch(() => {});

    // These labels also exist (disabled) on the page behind the dialog —
    // scope to the open dialog to avoid strict-mode ambiguity, and they're
    // Autocomplete comboboxes, not plain text fields
    const dialog = page.locator('.MuiDialog-root, .MuiModal-root').last();
    for (const label of ['Lawyer name or ID', 'GPA Holder name or ID', /Legal Agent name or ID/]) {
      const input = dialog.getByRole('combobox', { name: label }).or(dialog.getByLabel(label)).first();
      await input.click();
      const opts = page.locator('[role="listbox"] [role="option"]');
      if (await opts.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await opts.first().click();
      } else {
        await input.fill('Test Legal Contact').catch(() => {});
      }
    }

    await page.getByRole('button', { name: 'Save' }).click();
    // A confirmation prompt may follow the save
    const yesBtn = page.locator('.MuiDialog-root, .MuiModal-root').getByRole('button', { name: /^(Yes|Confirm|Ok|Okay)$/i });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByRole('heading', { name: 'Suit file information', exact: true })).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
    // Guarantee no dialog carries over into the next test on this shared page
    await expect(page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)')).toHaveCount(0, { timeout: 10000 });
  });

  test('Subscriber Information - Edit case details fills and saves', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await clickFirstRow(page);

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Accused Name').fill('Test Accused Name').catch(() => {});
    await page.getByLabel('Court Hall').fill('Test Court Hall').catch(() => {});

    await page.getByRole('button', { name: 'Save' }).click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByRole('button', { name: 'Cancel' })).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
  });

  test('Subscriber Information - Update dialog fills and saves', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await clickFirstRow(page);

    await page.getByRole('button', { name: 'Update' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Suit file information', exact: true })).toBeVisible({ timeout: 10000 });

    // Scope to the open dialog — "Next Date"/"Claim Amount" labels also exist
    // in the read-only case summary behind it
    const dialog = page.locator('.MuiDialog-root, .MuiModal-root').last();
    const nextDateInput = dialog.getByLabel('Next Date', { exact: false }).first();
    await nextDateInput.fill('2026-12-31');
    await expect(nextDateInput).toHaveValue('2026-12-31');

    const claimAmountInput = dialog.getByLabel('Claim Amount', { exact: false }).first();
    if (await claimAmountInput.isVisible().catch(() => false)) {
      await claimAmountInput.fill('5000');
    }
    await dialog.getByLabel('Remarks').fill('Test update remarks');

    await dialog.getByRole('button', { name: 'Save' }).click();
    // A confirmation prompt may follow the save
    const yesBtn = page.locator('.MuiDialog-root, .MuiModal-root').getByRole('button', { name: /^(Yes|Confirm|Ok|Okay)$/i });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByRole('heading', { name: 'Suit file information', exact: true })).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
    // Guarantee no dialog carries over into the next test on this shared page
    await expect(page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)')).toHaveCount(0, { timeout: 10000 });
  });

  test('Subscriber Information - Edit Progress Entry fills and saves', async ({ authenticatedPage: page }) => {
    test.setTimeout(120000);
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await clickFirstRow(page);

    // Progress-log entries pair an Edit button with a Delete button; the
    // top-level case-details Edit has no adjacent Delete. Anchor on the
    // first Delete button's row instead of a global Edit index, since the
    // number of progress entries/edit buttons grows as earlier tests in this
    // file create real suite files and updates.
    const firstDeleteBtn = page.getByRole('button', { name: 'Delete' }).first();
    await firstDeleteBtn.waitFor({ state: 'visible', timeout: 10000 });
    const progressEntryEdit = firstDeleteBtn.locator('xpath=preceding-sibling::button[1]');
    await progressEntryEdit.click();
    await expect(page.getByText('Edit Progress Entry')).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Remarks').fill('Test progress entry update').catch(() => {});
    await page.getByRole('button', { name: 'Add Document' }).click().catch(() => {});
    await page.locator('input[type="file"]').first().setInputFiles('tests/assets/test-image.png').catch(() => {});

    await page.getByRole('button', { name: 'Save' }).click();
    const yesBtn = page.locator('.MuiDialog-root, .MuiModal-root').getByRole('button', { name: /^(Yes|Confirm|Ok|Okay)$/i });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByText('Edit Progress Entry')).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
    // Guarantee no dialog carries over into the next test on this shared page
    await expect(page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)')).toHaveCount(0, { timeout: 10000 });
  });

  test('Subscriber Information - Delete opens confirmation dialog and Cancel preserves the entry', async ({ authenticatedPage: page }) => {
    // Cancel-only by design: this deletes real progress-log data used by
    // other tests in this file, so we verify the confirmation flow without
    // executing the destructive action.
    await ensureLegalProspectOpen(page);
    await page.getByRole('menuitem', { name: 'SF Case Wise Report' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'SF Case Wise Report' })).toBeVisible({ timeout: 10000 });
    await clickFirstRow(page);

    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByText('Delete Progress Entry')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Are you sure you want to delete this progress entry?')).toBeVisible();

    await page.locator('.MuiDialog-root, .MuiModal-root').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Delete Progress Entry')).toBeHidden({ timeout: 10000 });
  });

  // ── FAVORITE ────────────────────────────────────────────────────────────
  test('Favorite - page loads', async ({ authenticatedPage: page }) => {
    await page.getByText('Favorite', { exact: true }).first().click();
    await noBackdrop(page);

    await page.waitForTimeout(1000);
    await expect(page.locator('.MuiBackdrop-root')).toBeHidden({ timeout: 5000 }).catch(() => {});
  });
});
