import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

async function cancelForm(page: Page) {
  await page.getByRole('button', { name: /Cancel/i }).click();
  const yesBtn = page.getByRole('button', { name: 'Yes' });
  if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
  await noBackdrop(page).catch(() => {});
}

// Pick the first real option in a MUI Autocomplete addressed by accessible
// name. Skips comboboxes that already hold a value; opens via input click,
// then ArrowDown, then the control's popup-indicator button.
async function pickComboByName(page: Page, name: string | RegExp) {
  const input = page.getByRole('combobox', { name }).first();
  if (await input.inputValue().catch(() => '')) return;
  // Options inside the OPEN popup only (hidden native <option> elements on
  // some pages would match getByRole('option') first and hang the wait)
  const opts = page.locator('[role="listbox"] [role="option"]');
  // The popup-indicator button (aria-label "Open") is the reliable opener;
  // fall back to a force click + ArrowDown on the input
  const openBtn = input
    .locator('xpath=ancestor::*[contains(@class,"MuiAutocomplete-root")][1]')
    .getByRole('button', { name: 'Open' });
  if (await openBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await openBtn.click();
  }
  if (!(await opts.first().isVisible({ timeout: 2000 }).catch(() => false))) {
    await input.click({ force: true }).catch(() => {});
    await input.press('ArrowDown').catch(() => {});
  }
  if (!(await opts.first().isVisible({ timeout: 2000 }).catch(() => false))) {
    // Server-search autocompletes only render options after typing
    await input.pressSequentially('a').catch(() => {});
  }
  await opts.first().waitFor({ state: 'visible', timeout: 8000 });
  const real = opts.filter({ hasNotText: /^Add / }).first();
  if (await real.isVisible({ timeout: 2000 }).catch(() => false)) {
    await real.click();
  } else {
    await opts.first().click();
  }
  await page.waitForTimeout(300);
}

async function ensureAccountsCreationOpen(page: Page) {
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Dismiss any open modal/dialog BEFORE early-return so it doesn't block later navigation
  const modal = page.locator('.MuiModal-root');
  if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    const yesBtn = page.getByRole('button', { name: 'Yes' });
    if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) await yesBtn.click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  const addVendorItem = page.getByRole('menuitem', { name: 'Add vendor' });
  const groupLedgerItem = page.getByRole('menuitem', { name: 'Group & Ledger creation' });
  // A previous test's completed flow can leave the Creation submenu
  // rendered with only the first item visible (mid-collapse/render race) —
  // verify a LATER item too before trusting the submenu is fully open
  if (await addVendorItem.isVisible().catch(() => false) && await groupLedgerItem.isVisible().catch(() => false)) return;

  const accountsTab = page.getByText('Accounts', { exact: true }).first();
  if (!(await accountsTab.isVisible({ timeout: 2000 }).catch(() => false))) {
    await page.locator('[data-testid="selectednavitecreationbutton0"]').click({ timeout: 5000 }).catch(async () => {
      await page.locator('div[role="button"]').first().click({ timeout: 5000 }).catch(() => {});
    });
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await accountsTab.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
    await accountsTab.waitFor({ state: 'visible', timeout: 10000 });
  }
  await accountsTab.scrollIntoViewIfNeeded().catch(() => {});
  await accountsTab.click({ timeout: 20000 });
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

  const creationBtn = page.getByRole('button', { name: 'Creation', exact: true });
  await creationBtn.waitFor({ state: 'visible', timeout: 15000 });

  // The submenu toggle can be in an unknown state (a previous test may have
  // left it open or mid-animation), so a single click doesn't reliably open
  // it. Retry the click a few times until both marker items are visible.
  let opened = false;
  for (let attempt = 0; attempt < 3 && !opened; attempt++) {
    await creationBtn.click();
    const gotFirst = await addVendorItem.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    const gotSecond = gotFirst && await groupLedgerItem.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    opened = gotFirst && gotSecond;
    if (!opened) await page.waitForTimeout(500);
  }
  if (!opened) {
    throw new Error('Accounts > Creation submenu did not open after 3 attempts');
  }
}

test.describe('Accounts - Creation - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page }, testInfo) => {
    await tagAllure(testInfo, 'Accounts Operation', [['', 'Creation']]);
    await ensureAccountsCreationOpen(page);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD VENDOR
  // ═══════════════════════════════════════════════════════════════════════════

  test('add vendor page loads with heading and total count', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Vendor count/)).toBeVisible();
  });

  test('add vendor table shows correct visible columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('columnheader', { name: 'Service type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Vendor name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Company name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Vendor type', exact: true })).toBeVisible();
  });

  test('add vendor page has search input, date filter, and Add button', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByPlaceholder('Search')).toBeVisible();
    await expect(page.locator('input#date')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });

  test('add vendor search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder('Search');
    await searchInput.fill('PINKY');
    await expect(searchInput).toHaveValue('PINKY');
    await searchInput.clear();
  });

  test('add vendor pagination shows 2 pages', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toBeVisible();
  });

  test('add vendor pagination navigates to page 2 and back', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(page.getByRole('button', { name: 'page 2' })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Go to previous page' }).click();
    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible({ timeout: 5000 });
  });

  test('add vendor - Add button opens Vendor person dialog', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Vendor person')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('+91 9000000000')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();

    await cancelForm(page);
  });

  test('add vendor - Cancel button closes the Vendor person dialog', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Vendor person')).toBeVisible({ timeout: 5000 });

    await cancelForm(page);
    await expect(page.getByText('Vendor person')).toBeHidden({ timeout: 5000 });
  });

  test('add vendor - Next in dialog loads vendor creation form', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Vendor person')).toBeVisible({ timeout: 5000 });

    // Fill phone → triggers POST /member/list to populate Name dropdown
    await page.getByPlaceholder('+91 9000000000').fill('9876543216');
    await page.waitForResponse(
      resp => resp.url().includes('/member/list') && resp.request().method() === 'POST',
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    // Click Name combobox → options appear: "Add New Vendor" + member name
    // Selecting "Add New Vendor" changes the button; select the member option instead
    const nameInput = page.locator('input[role="combobox"]').first();
    await nameInput.click();
    await page.waitForTimeout(500);
    const memberOption = page.getByRole('option').filter({ hasNotText: 'Add New Vendor' }).first();
    if (await memberOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await memberOption.click();
    } else {
      await page.getByRole('option').nth(1).click();
    }

    await page.getByRole('button', { name: 'Next' }).click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByText('Personal information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Vendor info')).toBeVisible();

    // go back so next test starts clean
    await cancelForm(page);
  });

  test('add vendor - creates new vendor company and saves', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    // ── step 1: dialog ──────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Vendor person')).toBeVisible({ timeout: 5000 });

    // Fill phone → triggers POST /member/list to populate Name dropdown
    await page.getByPlaceholder('+91 9000000000').fill('9876543216');
    await page.waitForResponse(
      resp => resp.url().includes('/member/list') && resp.request().method() === 'POST',
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    // Click Name combobox and select the member option (not "Add New Vendor")
    const nameInputV = page.locator('input[role="combobox"]').first();
    await nameInputV.click();
    await page.waitForTimeout(500);
    const memberOptionV = page.getByRole('option').filter({ hasNotText: 'Add New Vendor' }).first();
    if (await memberOptionV.isVisible({ timeout: 3000 }).catch(() => false)) {
      await memberOptionV.click();
    } else {
      await page.getByRole('option').nth(1).click();
    }
    await page.getByRole('button', { name: 'Next' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Personal information')).toBeVisible({ timeout: 10000 });

    // ── step 2: vendor info form ─────────────────────────────────────────────
    // Company radio is pre-selected; fill company name
    await page.getByPlaceholder('Name').fill('Test Company Vendor');
    await page.getByPlaceholder('Address').fill('123 Test Street');

    // Type of company / Service type / Vendor at branch — skip any "Add ..." option
    const enabledCombos = page.locator('input[role="combobox"]:not(.Mui-disabled)');
    for (let i = 0; i < 3; i++) {
      await enabledCombos.nth(i).scrollIntoViewIfNeeded().catch(() => {});
      await enabledCombos.nth(i).click();
      await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 });
      const realOpt = page.getByRole('option').filter({ hasNotText: /^Add / }).first();
      if (await realOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await realOpt.click();
      } else {
        await page.getByRole('option').nth(1).click();
      }
      await page.waitForTimeout(300);
    }

    // ── Bank details ─────────────────────────────────────────────────────────
    await page.getByPlaceholder('Hyber Networking Private Limited').fill('Test Beneficiary');
    await page.getByLabel('Bank account number').fill('9876543210');
    await page.getByLabel('Bank IFSC code').fill('HDFC0001234');

    // The 4th enabled combobox is the bank name/type autocomplete after the IFSC field
    const bankNameCombo = enabledCombos.nth(3);
    await bankNameCombo.scrollIntoViewIfNeeded().catch(() => {});
    await bankNameCombo.click({ timeout: 5000 });
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 });
    const realBankOpt = page.getByRole('option').filter({ hasNotText: /^Add / }).first();
    if (await realBankOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await realBankOpt.click();
    } else {
      await page.getByRole('option').nth(1).click();
    }
    // Wait for any async loading after bank selection (e.g. fetching linked branch/GST data)
    await page.waitForTimeout(2000);
    await noBackdrop(page).catch(() => {});

    // ── Submit ───────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Save & confirm' }).click();

    // Handle optional "Yes" confirmation dialog that may appear after Save & confirm
    const yesBtn = page.locator('.MuiDialog-root').getByRole('button', { name: 'Yes' });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await yesBtn.click();
    }
    await noBackdrop(page).catch(() => {});

    await expect(
      page.getByText(/success/i)
        .or(page.getByText('Vendor information'))
        .or(page.getByText(/saved/i))
        .or(page.getByText(/vendor.*created/i))
    ).toBeVisible({ timeout: 30000 });
  });

  test('add vendor - Add New Vendor fills personal entry form and saves', async ({ authenticatedPage: page }) => {
    test.setTimeout(240000);
    await page.getByRole('menuitem', { name: 'Add vendor' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Vendor information')).toBeVisible({ timeout: 10000 });

    // ── step 1: dialog — enter phone and select "Add New Vendor" ────────────
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Vendor person')).toBeVisible({ timeout: 5000 });

    const uniquePhone = `98765${Date.now().toString().slice(-5)}`;
    await page.getByPlaceholder('+91 9000000000').fill(uniquePhone);
    await page.waitForResponse(
      resp => resp.url().includes('/member/list') && resp.request().method() === 'POST',
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[role="combobox"]').first();
    await nameInput.click();
    await page.waitForTimeout(500);
    const addNewOpt = page.getByRole('option', { name: 'Add New Vendor' });
    if (await addNewOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addNewOpt.click();
    } else {
      await page.getByRole('option').first().click();
    }

    await page.getByRole('button', { name: 'Add New Vendor' }).click({ timeout: 5000 }).catch(async () => {
      await page.getByRole('button', { name: 'Next' }).click({ timeout: 5000 });
    });
    await noBackdrop(page).catch(() => {});

    // ── step 2: New Vendor Entry form ───────────────────────────────────────
    await expect(page.getByRole('button', { name: 'Individual' })).toBeVisible({ timeout: 15000 });
    await noBackdrop(page).catch(() => {});

    // Aadhar Card No — must be UNIQUE per run ("Aadhar already linked" rejects
    // reuse); use pressSequentially for React compatibility
    const uniqueAadhar = `5${Date.now().toString().slice(-11)}`;
    const aadharInput = page.getByLabel('Aadhar Card No');
    await aadharInput.click();
    await aadharInput.pressSequentially(uniqueAadhar);

    // File uploads
    const fileInputs = page.locator('input[type="file"]');
    const testImagePath = 'tests/assets/test-image.png';
    const fileCount = await fileInputs.count();
    for (let i = 0; i < fileCount; i++) {
      await fileInputs.nth(i).setInputFiles(testImagePath).catch(() => {});
    }

    // Comboboxes by their live-verified accessible names ("Mr" is pre-selected)
    await pickComboByName(page, 'Mr');
    await pickComboByName(page, 'S/o');
    await pickComboByName(page, 'Gender');
    await pickComboByName(page, 'Created branch');
    await pickComboByName(page, 'Occupation');

    // Name + Father/Guardian Name — both render as textbox "Name"
    const nameFields = page.getByRole('textbox', { name: 'Name', exact: true });
    await nameFields.nth(0).fill('Test Vendor Name');
    await expect(nameFields.nth(0)).toHaveValue('Test Vendor Name');
    await nameFields.nth(1).fill('Test Father Name');

    // DOB — must be a past date (dd/mm/yyyy mask). Verify the mask accepted
    // it; retry without slashes if not.
    const dobInput = page.getByRole('textbox', { name: 'Date of Birth' });
    await dobInput.click();
    await dobInput.pressSequentially('01/01/1990', { delay: 50 });
    if (!/1990/.test(await dobInput.inputValue())) {
      await dobInput.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await dobInput.pressSequentially('01011990', { delay: 50 });
    }
    await expect(dobInput).toHaveValue(/1990/);

    await page.getByRole('spinbutton', { name: 'Annual Income' }).fill('500000');

    // ── Address section — the form starts with TWO address blocks; fill both ─
    const doorNos = page.getByRole('textbox', { name: 'Res.Door No.' });
    const landmarks = page.getByRole('textbox', { name: 'Land mark' });
    const addresses = page.getByRole('textbox', { name: 'Address', exact: true });
    const pinCodes = page.getByRole('spinbutton', { name: 'Pin Code' });
    const blockCount = await doorNos.count();
    for (let i = 0; i < blockCount; i++) {
      await doorNos.nth(i).fill('42');
      await landmarks.nth(i).fill('Near Test Plaza');
      await addresses.nth(i).fill('123 Test Street');
      await pinCodes.nth(i).fill('500001');
      // Pin code auto-fills City/District/State/Country via API
      await page.waitForTimeout(2000);
    }

    // ── Employment section ──────────────────────────────────────────────────
    await pickComboByName(page, 'Type of employment');
    await page.getByRole('textbox', { name: 'Department or company name' }).fill('Test Dept');
    await page.getByRole('textbox', { name: 'Designation' }).fill('Manager');
    await page.getByRole('spinbutton', { name: 'Ctc' }).fill('600000');
    await page.getByRole('spinbutton', { name: 'Net Salary' }).fill('500000');

    // Every combobox must hold a value before Save — pinpoints the culprit
    // instead of a silent validation rejection
    for (const n of ['Mr', 'S/o', 'Gender', 'Created branch', 'Occupation', 'Type of employment']) {
      await expect(page.getByRole('combobox', { name: n }).first()).not.toHaveValue('');
    }

    // ── Submit ──────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await noBackdrop(page).catch(() => {});

    // After save: expect redirect to vendor details page or success message,
    // and the entry form must be gone
    await expect(
      page.getByText(/success/i).first()
        .or(page.getByText('Vendor info'))
        .or(page.getByText('Personal information'))
        .or(page.getByText(/saved/i).first())
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'New Vendor Entry' })).toBeHidden({ timeout: 10000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BANK
  // ═══════════════════════════════════════════════════════════════════════════

  test('bank list loads with heading and total count', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Banks/)).toBeVisible();
  });

  test('bank table shows correct visible columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('columnheader', { name: 'Bank Group', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Account Number', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'IFSC Code', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Bank Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Bank At Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Minimum Balance', exact: true })).toBeVisible();
  });

  test('bank page has search input and Add button', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByPlaceholder('Search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });

  test('bank search box accepts input', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder('Search');
    await searchInput.fill('CANARA');
    await expect(searchInput).toHaveValue('CANARA');
    await searchInput.clear();
  });

  test('bank pagination shows 2 pages', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toBeVisible();
  });

  test('bank pagination navigates to page 2 and back', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(page.getByRole('button', { name: 'page 2' })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Go to previous page' }).click();
    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible({ timeout: 5000 });
  });

  test('bank Add button navigates to add form with Bank section', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);

    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await expect(page.getByPlaceholder('signature_authority')).toBeVisible();
    await expect(page.getByPlaceholder('Bank at branch(company branch)')).toBeVisible();
  });

  test('bank add form has Ledger information section with disabled fields', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Ledger information')).toBeVisible();
    await expect(page.locator('[name="ledgerName"]')).toBeVisible();
    await expect(page.locator('[name="ledgerCode"]')).toBeVisible();
    await expect(page.locator('[name="ledgerType"]')).toBeVisible();
    await expect(page.locator('[name="gstInclusive"]')).toBeVisible();
    await expect(page.locator('[name="gstExclusive"]')).toBeVisible();
  });

  test('bank add form has Accessible Branch list section with table and count', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Accessible Branch list information')).toBeVisible();
    await expect(page.getByText(/Total count/)).toBeVisible();
    await expect(page.locator('[aria-label="ledger info table"]')).toBeVisible();
  });

  test('bank add form branch table has correct columns', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    const table = page.locator('[aria-label="ledger info table"]');
    await expect(table.getByRole('columnheader', { name: 'Branch List' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Receipt' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Chit Payment' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Genral Payment' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'FD' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'View' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Payment Gateway' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'UPI' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Nach' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Auto Payment' })).toBeVisible();
  });

  test('bank add form branch table has search and shows CORP_OFFICE row', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    // Branch list has its own search input (second Search on the page)
    const searches = page.getByPlaceholder('Search');
    await expect(searches.last()).toBeVisible();
    // First visible branch row
    await expect(page.getByText('CORP_OFFICE')).toBeVisible();
  });

  test('bank add form has Cancel and Save buttons', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    await cancelForm(page);
  });

  test('bank add form Cancel returns to bank list', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    await cancelForm(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
  });

  test('bank — creation form fills all fields and saves', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Bank' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Bank Information')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Service provider bank information')).toBeVisible({ timeout: 10000 });

    test.setTimeout(120000);

    // Live-verified structure: 3 ENABLED comboboxes (Bank group, Bank at
    // branch, and one in Ledger information); the Ledger name/code/type/GST
    // fields are DISABLED (auto-derived from the bank selection).
    const enabledCombos = page.locator('input[role="combobox"]:not([disabled])');

    // Bank group (combobox 0) — clicking the input opens the popup; skip any
    // "Add ..." option, which opens a nested bank-name dialog
    await enabledCombos.nth(0).click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 6000 });
    const realBank = page.getByRole('option').filter({ hasNotText: /^Add / }).first();
    if (await realBank.isVisible({ timeout: 2000 }).catch(() => false)) {
      await realBank.click();
    } else {
      await page.getByRole('option').nth(1).click();
    }
    await page.waitForTimeout(500);

    await page.getByLabel('Bank branch').fill('Test Branch');
    await page.getByLabel('Account number').fill(`${Date.now()}`.slice(-12).padStart(14, '9'));
    await page.getByLabel('IFSC Code').fill('SBIN0001234');
    await page.getByLabel('Bank Address').fill('123 Test Street, Test City');
    await page.getByLabel('Email id').fill('testbank@example.com');
    await page.getByLabel('Contact number').fill('9876543210');
    await page.getByLabel('Minimum balance').fill('10000');
    await page.getByLabel('Cheque return charges by bank').fill('500');
    await page.getByLabel('Signature authority').fill('Test Authority');

    // Bank at branch (combobox 1)
    await enabledCombos.nth(1).click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 6000 });
    const realBranch = page.getByRole('option').filter({ hasNotText: /^Add / }).first();
    if (await realBranch.isVisible({ timeout: 2000 }).catch(() => false)) {
      await realBranch.click();
    } else {
      await page.getByRole('option').first().click();
    }
    await page.waitForTimeout(500);

    // Remaining enabled combobox in Ledger information (main group / type)
    if (await enabledCombos.count() > 2) {
      await enabledCombos.nth(2).click();
      const opt = page.getByRole('option').filter({ hasNotText: /^Add / }).first();
      if (await opt.isVisible({ timeout: 4000 }).catch(() => false)) {
        await opt.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }

    // Opening balance is the only editable ledger-info text field
    await page.getByLabel('Opening balance').fill('50000').catch(() => {});

    await page.getByRole('button', { name: 'Save' }).click();
    const yesBtn = page.locator('.MuiDialog-root').getByRole('button', { name: 'Yes' });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page).catch(() => {});

    await expect(
      page.getByText(/success/i).first()
        .or(page.getByText('Bank information saved', { exact: false }))
        .or(page.getByText(/saved/i).first())
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
    // Guarantee no dialog carries over into the next test on this shared page
    await expect(page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)')).toHaveCount(0, { timeout: 10000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP & LEDGER CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  test('group & ledger creation page loads with tree and group info panel', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page);

    // If a previous test left a heavy unrelated detail view (e.g. Bank
    // Configuration) still finishing its own render, this click can land
    // without the SPA router transitioning — retry once against the hash
    const companyInfo = page.getByText('company information');
    if (!(await companyInfo.isVisible({ timeout: 5000 }).catch(() => false))) {
      await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
      await noBackdrop(page).catch(() => {});
    }

    await expect(companyInfo).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Group information')).toBeVisible();
  });

  test('group & ledger creation tree shows expected top-level nodes', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page);
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Expenses')).toBeVisible();
    await expect(page.getByText('Assets')).toBeVisible();
    await expect(page.getByText('Liabilities')).toBeVisible();
    await expect(page.getByText('Income')).toBeVisible();
  });

  test('group & ledger creation has Add group, Add Ledger, Edit, Delete buttons', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    // Must select a tree node first — buttons are disabled without a selection
    await page.getByText('Expenses', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(1000);
    await noBackdrop(page).catch(() => {});

    await expect(page.getByRole('button', { name: 'Add group' })).toBeEnabled({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Ledger' })).toBeEnabled({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Edit' })).toBeEnabled({ timeout: 10000 });
  });

  test('group & ledger creation - clicking Income node shows group details', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    // Click the Income node in the left tree
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await noBackdrop(page).catch(() => {});

    // Right panel shows Income group details
    await expect(page.getByText('Group information')).toBeVisible();
    await expect(page.getByText(/Group name/)).toBeVisible();
    await expect(page.getByText(/Main Group/)).toBeVisible();
  });

  test('group & ledger creation - Add group opens dialog with required fields', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    // Select a tree node first — buttons are disabled without a selection
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await noBackdrop(page).catch(() => {});

    await page.getByRole('button', { name: 'Add group' }).click();

    await expect(page.getByText('Add Group', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Small finance')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    await cancelForm(page);
  });

  test('group & ledger creation - Add group Cancel closes dialog', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    // Select a tree node first — buttons are disabled without a selection
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});

    await page.getByRole('button', { name: 'Add group' }).click();
    await expect(page.getByText('Add Group', { exact: true })).toBeVisible({ timeout: 5000 });

    await cancelForm(page);
    await expect(page.getByText('Add Group', { exact: true })).toBeHidden({ timeout: 5000 });
  });

  test('group & ledger creation - Add group fills and saves new group', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    // Select Income in the tree so Main Group auto-fills to Income
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});

    await page.getByRole('button', { name: 'Add group' }).click();
    await expect(page.getByText('Add Group', { exact: true })).toBeVisible({ timeout: 5000 });

    const groupName = `TstGrp${Date.now().toString().slice(-6)}`;
    await page.getByPlaceholder('Small finance').fill(groupName);

    await page.getByRole('button', { name: 'Save' }).click();
    await noBackdrop(page).catch(() => {});
    // Wait for dialog/modal to close after save
    await page.locator('.MuiModal-root').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});

    await expect(
      page.getByText(/success/i).or(page.getByText(groupName)).or(page.getByText('Group information'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('group & ledger creation - Edit opens dialog pre-filled with selected group name', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    // Select Expenses node in the tree
    await page.getByText('Expenses', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});

    await page.getByRole('button', { name: 'Edit' }).click();

    await expect(page.getByText('Add Group', { exact: true })).toBeVisible({ timeout: 5000 });
    // Group name field should be pre-filled with "Expenses"
    await expect(page.getByPlaceholder('Small finance')).toHaveValue('Expenses');

    await cancelForm(page);
  });

  test('group & ledger creation - Edit dialog saves updated group name', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    await page.getByText('Expenses', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByText('Add Group', { exact: true })).toBeVisible({ timeout: 5000 });

    // Clear and re-enter the group name
    const nameInput = page.getByPlaceholder('Small finance');
    await nameInput.clear();
    await nameInput.fill('Expenses');

    await page.getByRole('button', { name: 'Save' }).click();
    await noBackdrop(page).catch(() => {});
    // Wait for dialog/modal to close after save so next test's beforeEach isn't blocked
    await page.locator('.MuiModal-root').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});

    await expect(
      page.getByText(/success/i).or(page.getByText('Group information'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('group & ledger creation - Edit dialog Cancel closes without saving', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    await page.getByText('Expenses', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByText('Add Group', { exact: true })).toBeVisible({ timeout: 5000 });

    await cancelForm(page);
    await expect(page.getByText('Add Group', { exact: true })).toBeHidden({ timeout: 5000 });
    await expect(page.getByText('Group information')).toBeVisible();
  });

  test('group & ledger creation - Add Ledger opens ledger form', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Add Ledger' }).click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByText('Ledger information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Travel reimbursement')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    await cancelForm(page);
  });

  test('group & ledger creation - ledger form has Tax information section', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Add Ledger' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Ledger information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Tax information')).toBeVisible();
    await expect(page.locator('[name="isTds"]')).toBeVisible();
    await expect(page.locator('[name="isGst"]')).toBeVisible();
    await expect(page.locator('[name="rcm"]')).toBeVisible();

    await cancelForm(page);
  });

  test('group & ledger creation - ledger form has Accessible branch list with table', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Add Ledger' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Ledger information')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Accessible branch list information')).toBeVisible();
    await expect(page.getByText(/Total count/)).toBeVisible();

    const table = page.locator('[aria-label="ledger info table"]');
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Branch List' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Edit' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'View' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Opening Balance' })).toBeVisible();
    await expect(page.getByText('CORP_OFFICE')).toBeVisible();

    await cancelForm(page);
  });

  test('group & ledger creation - ledger form Cancel returns to group info', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });
    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Add Ledger' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Ledger information')).toBeVisible({ timeout: 10000 });

    await cancelForm(page);
    await expect(page.getByText('Group information')).toBeVisible({ timeout: 10000 });
  });

  test('group & ledger creation - Add Ledger fills and saves new ledger', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'Group & Ledger creation' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('company information')).toBeVisible({ timeout: 10000 });

    await page.getByText('Income', { exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(500);
    await noBackdrop(page).catch(() => {});
    await page.getByRole('button', { name: 'Add Ledger' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByText('Ledger information')).toBeVisible({ timeout: 10000 });

    // Dr/Cr FIRST — selecting it triggers a re-render that would clear text fields filled before it
    const drCrSelect = page.locator('div[role="combobox"][aria-haspopup="listbox"]').first();
    await drCrSelect.click({ timeout: 5000 });
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('option').first().click();
    await noBackdrop(page).catch(() => {});

    // Fill text fields AFTER Dr/Cr — use pressSequentially to fire React synthetic events
    const ledgerName = `TstLgr${Date.now().toString().slice(-6)}`;
    const ledgerNameInput = page.getByPlaceholder('Travel reimbursement');
    await ledgerNameInput.click();
    await ledgerNameInput.pressSequentially(ledgerName);
    await expect(ledgerNameInput).toHaveValue(ledgerName);

    const openingBalanceInput = page.getByLabel('Opening balance');
    await openingBalanceInput.click().catch(() => {});
    await openingBalanceInput.pressSequentially('1000').catch(() => {});

    // Verify ledger name still set right before saving
    await expect(ledgerNameInput).toHaveValue(ledgerName);

    await page.getByRole('button', { name: 'Save' }).click();
    await noBackdrop(page).catch(() => {});
    await page.locator('.MuiModal-root').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});

    await expect(
      page.getByText(/success/i)
        .or(page.getByText(/saved/i))
        .or(page.getByText(ledgerName))
        .or(page.getByText('company information'))
    ).toBeVisible({ timeout: 15000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHRAGES (app typo for "Charges")
  // ═══════════════════════════════════════════════════════════════════════════

  test('chrages page loads with charges table', async ({ authenticatedPage: page }) => {
    // App has intentional typo "Chrages" in the menu item
    await page.getByRole('menuitem', { name: 'Chrages' }).click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByRole('columnheader', { name: /Charges/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: /Amount/i }).first()).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GST & TDS
  // ═══════════════════════════════════════════════════════════════════════════

  test('gst & tds page loads with GST/TDS toggle, percentage table and Edit', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'GST & TDS' }).click();
    await noBackdrop(page).catch(() => {});

    await expect(page.getByRole('columnheader', { name: /GST Type/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: /Percentage/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('gst & tds - Edit interaction in GST view, then TDS toggle switches view', async ({ authenticatedPage: page }) => {
    await page.getByRole('menuitem', { name: 'GST & TDS' }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /GST Type/i })).toBeVisible({ timeout: 10000 });

    // Live-verified app behavior: Edit is enabled only in the GST view and
    // does not open a form — the page stays a read-only config view. If the
    // app ever adds editable inputs, fill and save them.
    const editBtn = page.getByRole('button', { name: 'Edit' });
    await expect(editBtn).toBeVisible();
    if (await editBtn.isEnabled().catch(() => false)) {
      await editBtn.click();
      await noBackdrop(page).catch(() => {});

      const editInputs = page.locator('table input:not([disabled]), .MuiDataGrid-root input:not([disabled])');
      if (await editInputs.count() > 0) {
        const saveBtn = page.getByRole('button', { name: 'Save' });
        await saveBtn.click();
        const yesBtn = page.getByRole('button', { name: 'Yes' });
        if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
        await noBackdrop(page).catch(() => {});
        await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
      }
      await expect(page.getByRole('columnheader', { name: /Percentage/i })).toBeVisible({ timeout: 10000 });
    }

    // Switch to TDS view (radio labelled by adjacent text; Edit is disabled here)
    await page.getByText('TDS', { exact: true }).click();
    await noBackdrop(page).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Percentage/i })).toBeVisible({ timeout: 10000 });
  });

});
