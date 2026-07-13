import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

test.describe('Report - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }) => {
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await sidebar.reportButton.waitFor({ state: 'visible', timeout: 25000 });
    await sidebar.reportButton.click({ timeout: 20000 });
    await page.getByRole('menuitem', { name: 'Enrollment' }).waitFor({ state: 'visible', timeout: 10000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENROLLMENT
  // ═══════════════════════════════════════════════════════════════════════════

  test('enrollment page loads with heading, count, and table columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Enrollment' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Enrollment List' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Enrollments/)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Enrollment Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Group name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'chit Status', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value', exact: true })).toBeVisible();
  });

  test('enrollment page has toggle tabs, filters, download, and pagination', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Enrollment' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Enrollment List' })).toBeVisible({ timeout: 10000 });

    // Toggle tabs
    const enrollmentListBtn = page.getByRole('button', { name: 'Enrollment List', exact: true });
    const deletedListBtn = page.getByRole('button', { name: 'Deleted list', exact: true });
    await expect(enrollmentListBtn).toBeVisible();
    await expect(deletedListBtn).toBeVisible();

    // Filter dropdowns (5 comboboxes: ChitValue, Group Name, Sales department, Subscriber Type, Enrollment Status)
    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes.nth(0)).toBeVisible();
    await expect(comboboxes.nth(1)).toBeVisible();
    await expect(comboboxes.nth(2)).toBeVisible();
    await expect(comboboxes.nth(3)).toBeVisible();
    await expect(comboboxes.nth(4)).toBeVisible();

    // Date range filter
    await expect(page.locator('#filterEnrollmentDate')).toBeVisible();

    // Download button
    await expect(page.locator('#download')).toBeVisible();

    // Pagination
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="page 1"]')).toBeVisible();
  });

  test('enrollment page toggle to Deleted list and back', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Enrollment' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Enrollment List' })).toBeVisible({ timeout: 10000 });

    // Click Deleted list tab
    await page.getByRole('button', { name: 'Deleted list', exact: true }).click();
    await noBackdrop(page);
    // Page stays loaded (may change heading or show different data)
    await expect(page.getByRole('button', { name: 'Deleted list', exact: true })).toBeVisible();

    // Click back to Enrollment List
    await page.getByRole('button', { name: 'Enrollment List', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Enrollment List' })).toBeVisible();
  });

  test('enrollment page search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Enrollment' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Enrollment List' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Perfect');
    await expect(searchInput).toHaveValue('Perfect');
  });

  test('enrollment page pagination navigates to page 2', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Enrollment' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Enrollment List' })).toBeVisible({ timeout: 10000 });

    await page.locator('[aria-label="Go to page 2"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 2"]')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUEST INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════

  test('request information page loads with heading, count, and table columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Request Information' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Request information', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total count/)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Date and time', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Request', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service agent', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Request status', exact: true })).toBeVisible();
  });

  test('request information page has Mobile/Admin toggles and filters', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Request Information' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Request information', exact: true })).toBeVisible({ timeout: 10000 });

    // Toggle buttons
    const mobileBtn = page.getByRole('button', { name: 'Mobile', exact: true });
    const adminBtn = page.getByRole('button', { name: 'Admin', exact: true });
    await expect(mobileBtn).toBeVisible();
    await expect(adminBtn).toBeVisible();

    // Filter dropdowns (3 comboboxes: Service branch, Request type, Request status)
    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes.nth(0)).toBeVisible();
    await expect(comboboxes.nth(1)).toBeVisible();
    await expect(comboboxes.nth(2)).toBeVisible();

    // Date range filter
    await expect(page.locator('#filterEnrollmentDate')).toBeVisible();

    // Pagination
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('request information toggle to Admin and back to Mobile', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Request Information' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Request information', exact: true })).toBeVisible({ timeout: 10000 });

    // Click Admin
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Request information', exact: true })).toBeVisible();

    // Click back to Mobile
    await page.getByRole('button', { name: 'Mobile', exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Request information', exact: true })).toBeVisible();
  });

  test('request information search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Request Information' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Request information', exact: true })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Uma');
    await expect(searchInput).toHaveValue('Uma');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP BUSSINESS
  // ═══════════════════════════════════════════════════════════════════════════

  test('group bussiness page loads with heading, count, and table columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group Bussiness' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Group Bussiness' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Count/)).toBeVisible();
    await expect(page.getByText(/Total Group Business/)).toBeVisible();

    // Visible columns (first ~7, due to MUI column virtualization)
    await expect(page.getByRole('columnheader', { name: /Enrollmen/, exact: false })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Phone num/, exact: false })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value', exact: true })).toBeVisible();
  });

  test('group bussiness page has filters, download, and pagination', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group Bussiness' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Group Bussiness' })).toBeVisible({ timeout: 10000 });

    // Filter dropdowns (5 comboboxes: ChitValue, Group Name, Sales department, Subscriber Type, Enrollment Status)
    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes.nth(0)).toBeVisible();
    await expect(comboboxes.nth(1)).toBeVisible();
    await expect(comboboxes.nth(2)).toBeVisible();
    await expect(comboboxes.nth(3)).toBeVisible();
    await expect(comboboxes.nth(4)).toBeVisible();

    // Date range filter
    await expect(page.locator('#filterenrollmentDate')).toBeVisible();

    // Download
    await expect(page.locator('#download')).toBeVisible();

    // Pagination
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="page 1"]')).toBeVisible();
  });

  test('group bussiness search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group Bussiness' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Group Bussiness' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder="Search"]');
    await searchInput.fill('GUGAA');
    await expect(searchInput).toHaveValue('GUGAA');
  });

  test('group bussiness pagination navigates to page 2', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group Bussiness' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Group Bussiness' })).toBeVisible({ timeout: 10000 });

    await page.locator('[aria-label="Go to page 2"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 2"]')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AGREEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  test('agreement page loads with heading, count, and table columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Agreement' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Agreement list' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total count/)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Generated Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Enrollment Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Status', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Service Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscription Amount', exact: true })).toBeVisible();
  });

  test('agreement page has filters, download, and pagination', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Agreement' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Agreement list' })).toBeVisible({ timeout: 10000 });

    // Filter dropdowns (5 comboboxes: Chit Value, Sales Type, Subscriber Type, Signature Type, Agreement Status)
    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes.nth(0)).toBeVisible();
    await expect(comboboxes.nth(1)).toBeVisible();
    await expect(comboboxes.nth(2)).toBeVisible();
    await expect(comboboxes.nth(3)).toBeVisible();
    await expect(comboboxes.nth(4)).toBeVisible();

    // Date range filter
    await expect(page.locator('#filterenrollmentDate')).toBeVisible();

    // Download
    await expect(page.locator('#download')).toBeVisible();

    // Pagination
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="page 1"]')).toBeVisible();
  });

  test('agreement page search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Agreement' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Agreement list' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Prakya');
    await expect(searchInput).toHaveValue('Prakya');
  });

  test('agreement page pagination navigates to page 2', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Agreement' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Agreement list' })).toBeVisible({ timeout: 10000 });

    await page.locator('[aria-label="Go to page 2"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 2"]')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMBER LIST
  // ═══════════════════════════════════════════════════════════════════════════

  test('member list page loads with heading, count, and table columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Member List' }).click();
    await noBackdrop(page);

    await expect(page.getByText(/Total Member List/)).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('columnheader', { name: 'Phone Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'salutation', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Adhaar', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Gender', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'DOB', exact: true })).toBeVisible();
  });

  test('member list page has filters and pagination', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Member List' }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Member List/)).toBeVisible({ timeout: 10000 });

    // Filter dropdowns (3 comboboxes: Gender, Branch, Occupation)
    const comboboxes = page.getByRole('combobox');
    await expect(comboboxes.nth(0)).toBeVisible();
    await expect(comboboxes.nth(1)).toBeVisible();
    await expect(comboboxes.nth(2)).toBeVisible();

    // Date range filter
    await expect(page.locator('#date')).toBeVisible();

    // Pagination
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="page 1"]')).toBeVisible();
  });

  test('member list page search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Member List' }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Member List/)).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder="Search"]');
    await searchInput.fill('MEGHA');
    await expect(searchInput).toHaveValue('MEGHA');
  });

  test('member list pagination navigates to page 2', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Member List' }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Member List/)).toBeVisible({ timeout: 10000 });

    await page.locator('[aria-label="Go to page 2"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 2"]')).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSITE ENQUIRY REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  test('website enquiry report page loads with heading, count, and all columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Website Enquiry Report' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Website Enquiry Report', exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Chit Plan Enquiry/)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Phone Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Month(Installments)', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscription Amount', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date(Enquiry Date)', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Income', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Source Of Income', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email Address', exact: true })).toBeVisible();
  });

  test('website enquiry report has filter combobox, date filter, and search', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Website Enquiry Report' }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Chit Plan Enquiry/)).toBeVisible({ timeout: 10000 });

    // ChitValue combobox filter (id="filter-demo")
    const combobox = page.locator('#filter-demo');
    await expect(combobox).toBeVisible();
    await combobox.click();
    await page.locator('[role="listbox"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape');

    // Date range filter
    await expect(page.locator('#date')).toBeVisible();

    // Search input
    const searchInput = page.locator('input[placeholder="Search"]');
    await searchInput.fill('TestEnquiry');
    await expect(searchInput).toHaveValue('TestEnquiry');
  });

  test('website enquiry report shows empty table with No rows', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Website Enquiry Report' }).click();
    await noBackdrop(page);
    await expect(page.getByText(/Total Chit Plan Enquiry/)).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('No rows')).toBeVisible();

    // All pagination buttons should be disabled when no data
    await expect(page.locator('[aria-label="Go to first page"]')).toBeDisabled();
    await expect(page.locator('[aria-label="Go to previous page"]')).toBeDisabled();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeDisabled();
    await expect(page.locator('[aria-label="Go to last page"]')).toBeDisabled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING LIST
  // ═══════════════════════════════════════════════════════════════════════════

  test('processing list page loads with heading, count, and all visible columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Processing List' }).click();
    await noBackdrop(page);

    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Count/)).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Module', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Job Type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Employee ID', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'User Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Event Timesta/, exact: false })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payload', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Last Modified/, exact: false }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Execution Stat/, exact: false })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Exception Trace/, exact: false })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Retry Count', exact: true })).toBeVisible();
  });

  test('processing list has toggle buttons and clicks each one', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Processing List' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible({ timeout: 10000 });

    // All 4 toggle buttons visible
    await expect(page.getByTestId('Enrollment')).toBeVisible();
    await expect(page.getByTestId('Receipt')).toBeVisible();
    await expect(page.getByTestId('Auction')).toBeVisible();
    await expect(page.getByTestId('Payment')).toBeVisible();

    // Click RECEIPT toggle
    await page.getByTestId('Receipt').click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible();

    // Click AUCTION toggle
    await page.getByTestId('Auction').click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible();

    // Click PAYMENT toggle
    await page.getByTestId('Payment').click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible();

    // Click back to ENROLLMENT
    await page.getByTestId('Enrollment').click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible();
  });

  test('processing list has search, date filter, download, and payloadView buttons', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Processing List' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible({ timeout: 10000 });

    // Search input
    const searchInput = page.locator('input[placeholder="Search"]');
    await searchInput.fill('TESTER');
    await expect(searchInput).toHaveValue('TESTER');

    // Date range filter
    await expect(page.locator('#filtereventTimestamp')).toBeVisible();

    // Download button
    await expect(page.locator('#download')).toBeVisible();

    // payloadView buttons in table rows
    const payloadButtons = page.getByRole('button', { name: 'payloadView' });
    await expect(payloadButtons.first()).toBeVisible();
  });

  test('processing list pagination navigates pages', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Processing List' }).click();
    await noBackdrop(page);
    await expect(page.getByRole('heading', { name: 'Processing List', exact: true })).toBeVisible({ timeout: 10000 });

    // Page 1 is selected
    await expect(page.locator('[aria-label="page 1"]')).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="Go to last page"]')).toBeVisible();

    // Navigate to page 2
    await page.locator('[aria-label="Go to page 2"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 2"]')).toBeVisible();

    // Navigate to page 3
    await page.locator('[aria-label="Go to page 3"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 3"]')).toBeVisible();

    // Go back to first page
    await page.locator('[aria-label="Go to first page"]').click();
    await noBackdrop(page);
    await expect(page.locator('[aria-label="page 1"]')).toBeVisible();
  });
});
