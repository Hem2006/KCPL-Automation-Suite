import path from 'path';
import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { SchemeFormPage } from '../pages/scheme-form.page';
import { tagAllure } from '../helpers/allure-tags';

const TEST_ICON = path.join(__dirname, '../fixtures/assets/test-icon.png');

// Waits until the MUI backdrop CSS pointer-events is none — the only reliable signal
// that it won't intercept the next click. Visibility checks alone are insufficient
// because MUI keeps the backdrop in the DOM during its fade-out CSS animation.
const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Creation - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Creation', [
      ['scheme', 'Scheme'],
      ['group', 'Group'],
      ['generate payable', 'Generate Payable'],
    ]);
    await sidebar.creationButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    // With a shared page, clicking Creation when the submenu is already open closes it.
    // Only open the submenu if it isn't showing its items already.
    const schemeLink = page.getByTestId('M-enuIt-em');
    const isOpen = await schemeLink.isVisible().catch(() => false);
    if (!isOpen) {
      await sidebar.creationButton.click({ timeout: 20000 });
      await schemeLink.waitFor({ state: 'visible', timeout: 10000 });
    }
  });

  test('scheme page loads with table and filters', async ({ authenticatedPage: page }) => {
    await page.getByText('Scheme', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Scheme List')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Total Schemes/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Scheme' })).toBeVisible();
    await expect(page.locator('#download')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Scheme Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'No of installment' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction type' })).toBeVisible();
    // The scheme list has no "Status" column — assert on a real column instead
    await expect(page.getByRole('columnheader', { name: 'Maximum bid' })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('group page loads with table and filters', async ({ authenticatedPage: page }) => {
    await page.getByText('Group', { exact: true }).click();
    await expect(page.getByText('Group List')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Groups/)).toBeVisible();
    await expect(page.getByTestId('group-download').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Group Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction Type' })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('generate payable page loads with table and radio buttons', async ({ authenticatedPage: page }) => {
    await page.getByText('Generate payable', { exact: true }).click();
    await expect(page.getByText('Generate payable information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Group Tranfer Count/)).toBeVisible();
    await expect(page.getByText('Cancellation chit')).toBeVisible();
    await expect(page.getByText('Credit return')).toBeVisible();
    await expect(page.getByText('Bid advance')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Cancellation date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone Number' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id' })).toBeVisible();
  });

  test('scheme creation — fills form and saves new scheme', async ({ authenticatedPage: page }) => {
    const schemeName = `SC${Date.now().toString().slice(-13)}`;
    const form = new SchemeFormPage(page);

    await page.getByText('Scheme', { exact: true }).click();
    await page.getByText(/Total Schemes/).waitFor({ state: 'visible', timeout: 60000 });
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Create Scheme' }).click();
    await page.getByText('Scheme creation').waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);
    await page.getByLabel('Scheme Name').waitFor({ state: 'visible', timeout: 15000 });

    await form.schemeName.fill(schemeName);
    await form.chitValue.fill('100000');
    await form.noOfInstallment.fill('10');
    await noBackdrop(page);
    await form.selectAuctionType('Monthly');
    await form.minimumBid.fill('5');
    await form.maximumBid.fill('30');
    await noBackdrop(page);
    await form.selectCollectionOption('BEFORE_AUCTION');
    await form.enrollmentFees.fill('500');
    await form.companyCommission.fill('5');
    await form.companyTicket.fill('1');
    await form.penaltyNps.fill('2');
    await form.penaltyPs.fill('2');
    await form.penaltySfPa.fill('2');
    await form.minMemberForCC.fill('2');

    await form.chitIconInput.waitFor({ state: 'attached', timeout: 10000 });
    await form.chitIconInput.setInputFiles(TEST_ICON);

    await noBackdrop(page);
    await form.saveButton.click();

    // On success the app stays on the form and shows a toast — it does not navigate
    // to a Modify Scheme view.
    await expect(page.getByText('Scheme created successfully')).toBeVisible({ timeout: 30000 });
  });

  test('scheme view — Modify Scheme opens edit form and Cancel returns', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.getByTestId('M-enuIt-em').click();
    await page.getByText(/Total Schemes/).waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    await page.locator('.MuiDataGrid-row').first().click({ force: true });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.getByRole('button', { name: 'Modify Scheme' }).waitFor({ state: 'visible', timeout: 15000 });

    await page.getByRole('button', { name: 'Modify Scheme' }).click();
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await expect(page.getByLabel('Scheme Name')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await expect(
      page.getByRole('button', { name: 'Modify Scheme' }).or(page.getByText('Scheme List'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('group view — clicking a group row opens group detail', async ({ authenticatedPage: page }) => {
    await page.getByText('Group', { exact: true }).click();
    await page.getByText(/Total Groups/).waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 60000 });
    await noBackdrop(page);

    await page.locator('.MuiDataGrid-row').first().click({ force: true });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});

    // Navigating to a group row takes us off the Group List — verify that
    await expect(page.getByText('Group List')).not.toBeVisible({ timeout: 10000 });
  });

  // ── Scheme form field interactions ──────────────────────────────────────

  test('scheme form — edit field updates value', async ({ authenticatedPage: page }) => {
    await page.getByTestId('M-enuIt-em').click();
    await page.getByText(/Total Schemes/).waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    await page.locator('.MuiDataGrid-row').first().click({ force: true });
    await noBackdrop(page);
    await page.getByRole('button', { name: 'Modify Scheme' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Modify Scheme' }).click();
    await noBackdrop(page);

    // Scheme Name, Chit value and No of installment are disabled in the Update form —
    // Enrollment fees is editable.
    const editField = page.getByLabel('Enrollment fees');
    await editField.waitFor({ state: 'visible', timeout: 15000 });
    await editField.fill('750');
    await expect(editField).toHaveValue('750');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await noBackdrop(page);
  });

  test('scheme form — delete clears field value', async ({ authenticatedPage: page }) => {
    await page.getByTestId('M-enuIt-em').click();
    await page.getByText(/Total Schemes/).waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    await page.locator('.MuiDataGrid-row').first().click({ force: true });
    await noBackdrop(page);
    await page.getByRole('button', { name: 'Modify Scheme' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Modify Scheme' }).click();
    await noBackdrop(page);

    // Scheme Name is disabled in the Update form — use the editable Enrollment fees field.
    const deleteField = page.getByLabel('Enrollment fees');
    await deleteField.waitFor({ state: 'visible', timeout: 15000 });
    await deleteField.click();
    await deleteField.press('Control+a');
    await deleteField.press('Delete');
    await expect(deleteField).toHaveValue('');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await noBackdrop(page);
  });

  // ── Group form field interactions ─────────────────────────────────────────

  test('group detail — tab buttons switch views', async ({ authenticatedPage: page, sidebar }) => {
    await page.getByText('Group', { exact: true }).click();
    await page.getByText(/Total Groups/).waitFor({ state: 'visible', timeout: 60000 });
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    await page.locator('.MuiDataGrid-row').first().click({ force: true });
    await noBackdrop(page);

    // The group detail (General Information) is read-only — verify it loaded and the
    // Information / Transaction / Agreement Mode tabs switch views.
    await expect(page.getByText('General Information')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Transaction' }).click();
    await noBackdrop(page);
    await page.getByRole('button', { name: 'Agreement Mode' }).click();
    await noBackdrop(page);
    await page.getByRole('button', { name: 'Information', exact: true }).click();
    await expect(page.getByText('General Information')).toBeVisible({ timeout: 10000 });

    // Entering the detail view closed the Creation submenu — reopen it before navigating back.
    if (!(await page.getByText('Group', { exact: true }).isVisible().catch(() => false))) {
      await sidebar.creationButton.click();
      await page.getByText('Group', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
    await page.getByText('Group', { exact: true }).click();
    await page.getByText(/Total Groups/).waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);
  });

  // ── Generate Payable radio buttons ────────────────────────────────────────

  test('generate payable — all radio buttons open their tables', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.getByText('Generate payable', { exact: true }).click();
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    const radios = [
      'Cancellation chit',
      'Credit return',
      'Bid advance',
      'Cancellation for Group tranfer',
    ];

    for (const name of radios) {
      await page.getByRole('radio', { name }).click();
      await expect(page.getByRole('radio', { name })).toBeChecked({ timeout: 10000 });
      await noBackdrop(page);
      await expect(page.getByRole('grid')).toBeVisible({ timeout: 15000 });
    }

    // Restore the default radio (has data) — the shared page carries this state
    // into whichever test runs next, and "Cancellation for Group tranfer" (the
    // last radio above) has zero rows, which breaks tests expecting a populated grid.
    await page.getByRole('radio', { name: 'Cancellation chit' }).click();
    await expect(page.getByRole('radio', { name: 'Cancellation chit' })).toBeChecked({ timeout: 10000 });
    await noBackdrop(page);
  });

  // ── Generate Payable form field interactions ──────────────────────────────

  test('generate payable form — edit narration field', async ({ authenticatedPage: page, sidebar }) => {
    await page.getByText('Generate payable', { exact: true }).click();
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 60000 });
    // The app remembers the last-selected radio across navigations (even a fresh
    // "Generate payable" click) — force it back to the one radio guaranteed to have rows.
    await page.getByRole('radio', { name: 'Cancellation chit' }).click();
    await expect(page.getByRole('radio', { name: 'Cancellation chit' })).toBeChecked({ timeout: 10000 });
    await noBackdrop(page);
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    await page.locator('.MuiDataGrid-virtualScroller').evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.getByText('GENERATEPAYABLE', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('GENERATEPAYABLE', { exact: true }).first().click({ force: true });
    await page.getByRole('heading', { name: 'Cancellation' }).first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    const narrationField = page.getByLabel('Narration');
    await narrationField.waitFor({ state: 'visible', timeout: 10000 });
    await narrationField.fill('Edited narration text');
    await expect(narrationField).toHaveValue('Edited narration text');

    // Entering the detail form closed the Creation submenu — reopen it before navigating back.
    if (!(await page.getByText('Generate payable', { exact: true }).isVisible().catch(() => false))) {
      await sidebar.creationButton.click();
      await page.getByText('Generate payable', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
    await page.getByText('Generate payable', { exact: true }).click();
    // Label text depends on the currently selected radio (e.g. "Total Cancellation
    // Chit Count") — match generically instead of assuming a specific radio's label.
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);
  });

  test('generate payable form — delete clears narration field', async ({ authenticatedPage: page, sidebar }) => {
    await page.getByText('Generate payable', { exact: true }).click();
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 60000 });
    // The app remembers the last-selected radio across navigations (even a fresh
    // "Generate payable" click) — force it back to the one radio guaranteed to have rows.
    await page.getByRole('radio', { name: 'Cancellation chit' }).click();
    await expect(page.getByRole('radio', { name: 'Cancellation chit' })).toBeChecked({ timeout: 10000 });
    await noBackdrop(page);
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    await page.locator('.MuiDataGrid-virtualScroller').evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.getByText('GENERATEPAYABLE', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('GENERATEPAYABLE', { exact: true }).first().click({ force: true });
    await page.getByRole('heading', { name: 'Cancellation' }).first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    const narrationField = page.getByLabel('Narration');
    await narrationField.waitFor({ state: 'visible', timeout: 10000 });
    await narrationField.fill('some text to delete');
    await narrationField.click();
    await narrationField.press('Control+a');
    await narrationField.press('Delete');
    await expect(narrationField).toHaveValue('');

    // Entering the detail form closed the Creation submenu — reopen it before navigating back.
    if (!(await page.getByText('Generate payable', { exact: true }).isVisible().catch(() => false))) {
      await sidebar.creationButton.click();
      await page.getByText('Generate payable', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
    await page.getByText('Generate payable', { exact: true }).click();
    // Label text depends on the currently selected radio (e.g. "Total Cancellation
    // Chit Count") — match generically instead of assuming a specific radio's label.
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('generate payable — GENERATEPAYABLE fills cancellation form and saves', async ({ authenticatedPage: page }) => {
    await page.getByText('Generate payable', { exact: true }).click();
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 60000 });
    // The app remembers the last-selected radio across navigations (even a fresh
    // "Generate payable" click) — force it back to the one radio guaranteed to have rows.
    await page.getByRole('radio', { name: 'Cancellation chit' }).click();
    await expect(page.getByRole('radio', { name: 'Cancellation chit' })).toBeChecked({ timeout: 10000 });
    await noBackdrop(page);
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 60000 });
    await noBackdrop(page);

    // GENERATEPAYABLE is in the last (Status) column which MUI DataGrid virtualizes out of the DOM.
    // Scroll the grid to the right end to bring it into the DOM, then click.
    await page.locator('.MuiDataGrid-virtualScroller').evaluate(el => { el.scrollLeft = el.scrollWidth; });
    // GENERATEPAYABLE elements are not <button> — use text match
    await page.getByText('GENERATEPAYABLE', { exact: true }).first().click({ force: true });

    // Cancellation form opens — two headings say "Cancellation", use heading role + first()
    await page.getByRole('heading', { name: 'Cancellation' }).first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    // Verify the key read-only summary fields loaded (testId avoids substring matches)
    await expect(page.getByTestId('Net payable')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('Debit type')).toBeVisible();

    // Fill the editable fields
    const narrationField = page.getByLabel('Narration');
    await narrationField.waitFor({ state: 'visible', timeout: 10000 });
    await narrationField.fill('Test cancellation narration');

    // DiscountValue is optional — fill only if present and editable
    const discountField = page.getByLabel('DiscountValue');
    const discountVisible = await discountField.isVisible({ timeout: 3000 }).catch(() => false);
    if (discountVisible) {
      await discountField.fill('0');
    }

    await noBackdrop(page);
    await page.getByRole('button', { name: 'Save' }).click();

    // After save, app should redirect back to the generate payable list.
    // Label text depends on the currently selected radio (e.g. "Total Cancellation
    // Chit Count") — match generically instead of assuming a specific radio's label.
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 30000 });
  });

  // ── Credit return / Bid advance — Add New flows ────────────────────────────

  test('credit return — Add New fills form and saves', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.getByText('Generate payable', { exact: true }).click();
    await page.getByText(/Total .+ Count/).waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);

    await page.getByRole('radio', { name: 'Credit return' }).click();
    await page.getByText('Total Credit Return Count').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);

    await page.getByRole('button', { name: 'Add New' }).click();
    await page.getByLabel('Phone number').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByLabel('Phone number').fill('8147115850');
    const groupField = page.getByLabel('Group / ticket no');
    await groupField.click();
    await page.getByRole('option').first().click();

    // Select the return type first — it sets a max-amount cap that the
    // Amount field validates against, so fill order matters.
    await page.getByLabel('Credit Return Type').click();
    await page.getByRole('option', { name: 'Dividend' }).click();
    await page.getByLabel('Amount').fill('10');

    await page.getByLabel('Narration').fill('Automated smoke test credit return');
    await page.getByRole('button', { name: 'Save' }).click();

    // Success signal is the redirect back to the list view (same convention as the
    // Cancellation Chit save test above) — the count label itself doesn't reliably
    // increment straight after save.
    await page.getByRole('button', { name: 'Add New' }).waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByText('Total Credit Return Count')).toBeVisible();
  });

  // Bid advance — Add New is intentionally not covered: it requires a ticket with an
  // active, un-prized auction bid, and none of the seeded dev accounts (8147115850,
  // 8147115854, 0000000000) have one — every "Group / ticket no" option renders
  // aria-disabled for this action. Revisit once a suitable dev fixture exists.
});
