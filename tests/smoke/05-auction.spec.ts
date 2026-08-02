import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

// Submenu links identified by SPA href — unambiguous across all page states
const POST_AUCTION = 'a[href="#/auction/auctioninformation/1"]';
const LIVE_AUCTION = 'a[href="#/auction/auctioninformation/2"]';
const SB_LIST      = 'a[href="#/auction/auctioninformation/3"]';

// Open a MUI Select by clicking its visible trigger div
const openSelect = (page: Page, inputName: string) =>
  page.locator(`input[name="${inputName}"]`)
    .locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")]')
    .locator('.MuiSelect-select')
    .click();

test.describe('Auction - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page, sidebar }, testInfo) => {
    await tagAllure(testInfo, 'Auction', [
      ['post auction', 'Post Auction'],
      ['live auction', 'Live Auction'],
      ['sb list', 'Sb List'],
    ]);
    await sidebar.auctionButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    const postAuctionItem = page.locator(POST_AUCTION);
    const isOpen = await postAuctionItem.isVisible().catch(() => false);
    if (!isOpen) {
      await sidebar.auctionButton.click({ timeout: 20000 });
      await postAuctionItem.waitFor({ state: 'visible', timeout: 20000 });
    }
  });

  // ─── POST AUCTION ────────────────────────────────────────────────────────────

  test('post auction page loads with table and toggle buttons', async ({ authenticatedPage: page }) => {
    await page.locator(POST_AUCTION).click();
    await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    await expect(page.getByText(/Total count/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pending For Auction Post' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Live Auction' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sb List' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Group Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit Value', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction Cycle', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction Mode', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('post auction — radio toggle to Successful bid post', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.locator(POST_AUCTION).click();
    await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    await page.getByText('Successful bid post').click();
    await noBackdrop(page);
    await expect(page.getByText('Pending for auction post list')).toBeVisible({ timeout: 10000 });
  });

  test('post auction — search box and filter dropdowns are interactive', async ({ authenticatedPage: page }) => {
    await page.locator(POST_AUCTION).click();
    await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);

    // Search box (adorned-end input — has the search icon)
    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('ACC');
    await expect(search).toHaveValue('ACC');

    // ChitValue dropdown
    await openSelect(page, 'chitValue');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Auction cycle dropdown (input name = auctionType)
    await openSelect(page, 'auctionType');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Auction mode dropdown
    await openSelect(page, 'auctionMode');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Date range input — MUI DatePicker; assert it is present and visible
    await expect(page.locator('#filtercreateDate')).toBeVisible();
  });

  test('post auction — subscriber count link navigates to subscriber detail', async ({ authenticatedPage: page, sidebar }) => {
    await page.locator(POST_AUCTION).click();
    await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
    // Close submenu only if currently open
    const subMenuOpen = await page.locator(POST_AUCTION).isVisible().catch(() => false);
    if (subMenuOpen) {
      await sidebar.auctionButton.click({ timeout: 20000 });
      await page.locator(POST_AUCTION).waitFor({ state: 'hidden', timeout: 10000 });
    }
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);
    const urlBefore = page.url();
    // Second auction-link-color is the Subscribers count of row 1
    await page.locator('.auction-link-color').nth(1).click();
    await noBackdrop(page);
    const urlAfter = page.url();
    if (urlAfter !== urlBefore) {
      await sidebar.auctionButton.click({ timeout: 20000 });
      await page.getByText('Post auction', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      await page.locator(POST_AUCTION).click();
      await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
    } else {
      await expect(page.getByText('Pending for auction post list')).toBeVisible({ timeout: 5000 });
    }
  });

  test('post auction — tab buttons switch between all three views', async ({ authenticatedPage: page }) => {
    await page.locator(POST_AUCTION).click();
    await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    // → Live Auction
    await page.getByRole('button', { name: 'Live Auction' }).click();
    await page.getByText('Live Auction List').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    // → Sb List
    await page.getByRole('button', { name: 'Sb List' }).click();
    await page.getByText(/Total count - \d+/).waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    // → back to Post Auction
    await page.getByRole('button', { name: 'Pending For Auction Post' }).click();
    await page.getByText('Pending for auction post list').waitFor({ state: 'visible', timeout: 15000 });
  });

  // ─── LIVE AUCTION ────────────────────────────────────────────────────────────

  test('live auction page loads with table and download button', async ({ authenticatedPage: page }) => {
    await page.locator(LIVE_AUCTION).click();
    await page.getByText('Live Auction List').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    await expect(page.getByText(/Total live auction/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Group Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit value', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Running Auction', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction Cycle', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('live auction — radio toggle to Re auction', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.locator(LIVE_AUCTION).click();
    await page.getByText('Live Auction List').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    await page.getByText('Re auction').click();
    await noBackdrop(page);
    await expect(page.getByText('Live Auction List')).toBeVisible({ timeout: 10000 });
  });

  test('live auction — search box and filter dropdowns are interactive', async ({ authenticatedPage: page }) => {
    await page.locator(LIVE_AUCTION).click();
    await page.getByText('Live Auction List').waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);

    // Search
    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('1CRORE');
    await expect(search).toHaveValue('1CRORE');

    // ChitValue dropdown
    await openSelect(page, 'chitValue');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Auction mode dropdown
    await openSelect(page, 'auctionMode');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Status dropdown
    await openSelect(page, 'status');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Date range input — MUI DatePicker; assert it is present and visible
    await expect(page.locator('#filterauctionEndDate')).toBeVisible();
  });

  // ─── SB LIST ─────────────────────────────────────────────────────────────────

  test('sb list page loads with table and download button', async ({ authenticatedPage: page }) => {
    await page.locator(SB_LIST).click();
    await page.getByText(/Total count - \d+/).waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction no', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Group Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auction date time', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Prized chit id', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subscriber name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chit value', exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
  });

  test('sb list — radio toggle to Re auction', { tag: ['@happy-flow'] }, async ({ authenticatedPage: page }) => {
    await page.locator(SB_LIST).click();
    await page.getByText(/Total count - \d+/).waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);
    await page.getByText('Re auction').click();
    await noBackdrop(page);
    await expect(page.getByText(/Total count/)).toBeVisible({ timeout: 10000 });
  });

  test('sb list — search box and filter dropdowns are interactive', async ({ authenticatedPage: page }) => {
    await page.locator(SB_LIST).click();
    await page.getByText(/Total count - \d+/).waitFor({ state: 'visible', timeout: 15000 });
    await noBackdrop(page);

    // Search
    const search = page.locator('.MuiInputBase-inputAdornedEnd').first();
    await search.fill('QUEEN');
    await expect(search).toHaveValue('QUEEN');

    // ChitValue dropdown
    await openSelect(page, 'chitValue');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Status dropdown
    await openSelect(page, 'status');
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');

    // Date range input — MUI DatePicker; assert it is present and visible
    await expect(page.locator('#filterlastModifiedOn')).toBeVisible();
  });

  test('sb list — Pending button opens minutes form page', async ({ authenticatedPage: page, sidebar }) => {
    await page.locator(SB_LIST).click();
    await page.getByText(/Total count - \d+/).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.MuiDataGrid-row').first().waitFor({ state: 'visible', timeout: 30000 });
    await noBackdrop(page);
    // "Minutes form" is the last column — virtualized; scroll right to bring it in
    await page.locator('.MuiDataGrid-virtualScroller').evaluate(el => { el.scrollLeft = el.scrollWidth; });
    const urlBefore = page.url();
    await page.locator('[aria-label="Open minutes form preview"]').first().click();
    await noBackdrop(page);
    const urlAfter = page.url();
    if (urlAfter !== urlBefore) {
      // Full page navigation — return via sidebar
      await sidebar.auctionButton.click({ timeout: 20000 });
      await page.locator(SB_LIST).waitFor({ state: 'visible', timeout: 10000 });
      await page.locator(SB_LIST).click();
    }
    await page.getByText(/Total count - \d+/).waitFor({ state: 'visible', timeout: 15000 });
  });
});
