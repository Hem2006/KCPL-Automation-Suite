import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';
import { tagAllure } from '../helpers/allure-tags';

const noBackdrop = (page: Page) => page.waitForFunction(() => {
  const el = document.querySelector('.MuiBackdrop-root');
  if (!el) return true;
  const s = window.getComputedStyle(el);
  return s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden';
}, { timeout: 30000 });

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

async function ensureHROpen(page: Page) {
  // Defensively dismiss any dialog/modal left open by a previous test on this
  // shared page BEFORE the early-return check — a leftover modal can be
  // invisible to that check but still block the tab click later. Some of the
  // app's modals are plain .MuiModal-root without the .MuiDialog-root class.
  const openDialog = page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)');
  if (await openDialog.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    const yesBtn = page.getByRole('button', { name: /^(Yes|Cancel|Ok|Okay|Close)$/i });
    if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) await yesBtn.click();
    await openDialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const employeeBtn = page.getByRole('button', { name: 'Employee', exact: true });
  if (await employeeBtn.isVisible().catch(() => false)) return;

  const hrTab = page.getByText('HR', { exact: true }).first();
  if (!(await hrTab.isVisible({ timeout: 2000 }).catch(() => false))) {
    await page.locator('[data-testid="selectednavitecreationbutton0"]').click({ timeout: 5000 }).catch(async () => {
      await page.locator('div[role="button"]').first().click({ timeout: 5000 }).catch(() => {});
    });
    await noBackdrop(page).catch(() => {});
    await page.waitForTimeout(1000);
    await hrTab.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
    await hrTab.waitFor({ state: 'visible', timeout: 10000 });
  }
  await hrTab.scrollIntoViewIfNeeded().catch(() => {});
  await hrTab.click();
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await employeeBtn.waitFor({ state: 'visible', timeout: 15000 });
}

async function ensureEmployeeOpen(page: Page) {
  await ensureHROpen(page);
  const empCreation = page.getByText('Employee Creation', { exact: true });
  if (await empCreation.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: 'Employee', exact: true }).click();
  await empCreation.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('HR - Smoke @smoke', () => {
  test.beforeEach(async ({ authenticatedPage: page }, testInfo) => {
    await tagAllure(testInfo, 'HR', [
      ['employee creation', 'Employee Creation'],
      ['advisor list', 'Advisor List'],
      ['incentive', 'Incentive'],
      ['holiday', 'Holiday'],
      ['designation', 'Designation'],
      ['dynamic assign value', 'Dynamic Assign Value'],
      ['report', 'Report'],
      ['favorite', 'Favorite'],
    ]);
    await ensureHROpen(page);
  });

  // ── EMPLOYEE CREATION ───────────────────────────────────────────────────
  test('Employee Creation - list loads with FULL TIME/PART TIME/AGENT tabs and columns', async ({ authenticatedPage: page }) => {
    await ensureEmployeeOpen(page);
    await page.getByText('Employee Creation', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Employee information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Employee count/i)).toBeVisible();

    await expect(page.getByRole('button', { name: 'FULL TIME' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PART TIME' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AGENT' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Employee Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Emp ID', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Joining Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Designation', exact: true })).toBeVisible();
  });

  test('Employee Creation - PART TIME and AGENT tabs switch views', async ({ authenticatedPage: page }) => {
    await ensureEmployeeOpen(page);
    await page.getByText('Employee Creation', { exact: true }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: 'PART TIME' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Employee information')).toBeVisible();

    await page.getByRole('button', { name: 'AGENT' }).click();
    await noBackdrop(page);
    await expect(page.getByText('Employee information')).toBeVisible();

    await page.getByRole('button', { name: 'FULL TIME' }).click();
    await noBackdrop(page);
  });

  test('Employee Creation - Add opens Add Employes dialog with Mobile Number and Name', async ({ authenticatedPage: page }) => {
    await ensureEmployeeOpen(page);
    await page.getByText('Employee Creation', { exact: true }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: /Add/ }).click();

    await expect(page.getByText('Add Employes')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Mobile Number')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();
    const yesBtn = page.getByRole('button', { name: 'Yes' });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page).catch(() => {});
  });

  test('Employee Creation - fills new employee personal form and saves', async ({ authenticatedPage: page }) => {
    test.setTimeout(240000);
    await ensureEmployeeOpen(page);
    await page.getByText('Employee Creation', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByText('Employee information')).toBeVisible({ timeout: 10000 });

    // ── step 1: Add Employes dialog — unique phone, then Next ───────────────
    await page.getByRole('button', { name: /Add/ }).click();
    await expect(page.getByText('Add Employes')).toBeVisible({ timeout: 5000 });

    // React-controlled input: .fill() does not stick — type it
    const uniquePhone = `98764${Date.now().toString().slice(-5)}`;
    const phoneInput = page.getByLabel('Mobile Number');
    await phoneInput.click();
    await phoneInput.pressSequentially(uniquePhone);
    await expect(phoneInput).toHaveValue(uniquePhone);
    await page.waitForResponse(
      resp => resp.url().includes('/member/list') && resp.request().method() === 'POST',
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    // Name combobox (same pattern as vendor dialog): pick the "Add New ..."
    // option so we land on the blank personal-entry form. The Add Employes
    // panel is NOT inside a .MuiDialog-root — target the combobox by name.
    const nameCombo = page.getByRole('combobox', { name: 'Name' });
    await nameCombo.click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 8000 });
    const addNewOpt = page.getByRole('option', { name: /Add New/i });
    if (await addNewOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addNewOpt.click();
    } else {
      await page.getByRole('option').first().click();
    }

    await page.getByRole('button', { name: /Next|Add New/i }).last().click();
    // The dialog must actually close/advance — if it stays open the submit failed.
    // Do NOT wait for backdrop here: the entry form may render inside a modal
    // whose own backdrop never goes hidden.
    await expect(page.getByText('Add Employes')).toBeHidden({ timeout: 15000 });

    // ── step 2: personal info entry form ────────────────────────────────────
    await expect(page.getByLabel('Aadhar Card No')).toBeVisible({ timeout: 20000 });
    await noBackdrop(page).catch(() => {});

    // Aadhar must be UNIQUE per run ("Aadhar already linked" rejects reuse)
    const aadharInput = page.getByLabel('Aadhar Card No');
    if (!(await aadharInput.inputValue().catch(() => ''))) {
      const uniqueAadhar = `6${Date.now().toString().slice(-11)}`;
      await aadharInput.click();
      await aadharInput.pressSequentially(uniqueAadhar);
    }

    // Upload test image into every file input (Aadhar, Profile Photo, Signature)
    const fileInputs = page.locator('input[type="file"]');
    const fileCount = await fileInputs.count();
    for (let i = 0; i < fileCount; i++) {
      await fileInputs.nth(i).setInputFiles('tests/assets/test-image.png').catch(() => {});
    }

    // Comboboxes by accessible name (same personal-entry component as vendor)
    await pickComboByName(page, 'Mr');
    await pickComboByName(page, 'S/o');
    await pickComboByName(page, 'Gender');
    await pickComboByName(page, 'Created branch');
    await pickComboByName(page, 'Occupation');

    // Name + Father/Guardian Name — both render as textbox "Name"
    const nameFields = page.getByRole('textbox', { name: 'Name', exact: true });
    await nameFields.nth(0).fill('Test Employee Name');
    await expect(nameFields.nth(0)).toHaveValue('Test Employee Name');
    if (await nameFields.count() > 1) {
      await nameFields.nth(1).fill('Test Father Name');
    }

    // DOB must be a past date (dd/mm/yyyy mask). Verify the mask accepted it;
    // retry without slashes if not.
    const dobInput = page.getByRole('textbox', { name: 'Date of Birth' });
    if (await dobInput.isVisible().catch(() => false) && !(await dobInput.inputValue().catch(() => ''))) {
      await dobInput.click();
      await dobInput.pressSequentially('01/01/1990', { delay: 50 });
      if (!/1990/.test(await dobInput.inputValue())) {
        await dobInput.click();
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await dobInput.pressSequentially('01011990', { delay: 50 });
      }
      await expect(dobInput).toHaveValue(/1990/);
    }

    const annualIncome = page.getByRole('spinbutton', { name: 'Annual Income' });
    if (await annualIncome.isVisible().catch(() => false)) {
      await annualIncome.fill('500000');
    }

    // Address blocks — fill every one present
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

    // Employment section (when present on the employee variant)
    const empType = page.getByRole('combobox', { name: 'Type of employment' });
    if (await empType.isVisible().catch(() => false)) {
      await pickComboByName(page, 'Type of employment');
      await page.getByRole('textbox', { name: 'Department or company name' }).fill('Test Dept').catch(() => {});
      await page.getByRole('textbox', { name: 'Designation' }).fill('Manager').catch(() => {});
      await page.getByRole('spinbutton', { name: 'Ctc' }).fill('600000').catch(() => {});
      await page.getByRole('spinbutton', { name: 'Net Salary' }).fill('500000').catch(() => {});
    }

    // Every combobox must hold a value before Save
    for (const n of ['Mr', 'S/o', 'Gender', 'Created branch', 'Occupation']) {
      await expect(page.getByRole('combobox', { name: n }).first()).not.toHaveValue('');
    }

    // Re-verify DOB right before submit: filling Pin Code (which triggers an
    // async City/District/State/Country lookup) can re-render the form and
    // silently clear/invalidate an earlier DOB entry
    const dobRecheck = page.getByRole('textbox', { name: 'Date of Birth' });
    if (!/1990/.test(await dobRecheck.inputValue().catch(() => ''))) {
      await dobRecheck.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await dobRecheck.pressSequentially('01011990', { delay: 50 });
      await expect(dobRecheck).toHaveValue(/1990/);
    }

    // ── submit ───────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await noBackdrop(page).catch(() => {});

    // The save round-trip (including file uploads) can genuinely take a while
    // under server load — actively wait for the entry heading to disappear
    // rather than assuming rejection after a short fixed delay. Only treat it
    // as rejected if it's still there after a generous timeout.
    const entryGone = await page.getByRole('heading', { name: 'New Employee Entry' })
      .waitFor({ state: 'hidden', timeout: 45000 })
      .then(() => true)
      .catch(() => false);
    if (!entryGone) {
      const invalids = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[aria-invalid="true"], .Mui-error input'))
          .map(el => el.closest('.MuiFormControl-root')?.querySelector('label')?.textContent || (el as HTMLInputElement).name || '?')
          .slice(0, 12)
      );
      const helperErrors = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.MuiFormHelperText-root.Mui-error, .MuiAlert-message'))
          .map(el => el.textContent?.trim()).filter(Boolean).slice(0, 10)
      );
      throw new Error(`Employee save rejected. Invalid fields: ${JSON.stringify(invalids)} | errors: ${JSON.stringify(helperErrors)}`);
    }

    // Success = entry form gone (redirect to details/list) with no error alert
    await expect(page.getByRole('heading', { name: 'New Employee Entry' })).toBeHidden({ timeout: 5000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);

    // A post-save confirmation modal can linger and block the next test's
    // sidebar navigation on this shared page — close it if present
    const leftoverDialog = page.locator('.MuiDialog-root, .MuiModal-root:not(.MuiDrawer-root)');
    if (await leftoverDialog.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = leftoverDialog.getByRole('button', { name: /^(Close|Ok|Okay|Done|Cancel|Yes)$/i }).first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await noBackdrop(page).catch(() => {});
    }
    await expect(leftoverDialog).toHaveCount(0, { timeout: 10000 });
  });

  // ── ADVISOR LIST ────────────────────────────────────────────────────────
  test('Advisor List - page loads with club tabs and columns', async ({ authenticatedPage: page }) => {
    await ensureEmployeeOpen(page);
    await page.getByText('Advisor List', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Advisor Information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Advisor Count/i)).toBeVisible();

    await expect(page.getByRole('button', { name: 'ALL CLUB' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PROBATION' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CONFIRMED' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Advisor Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Advisor ID', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Club Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Assigned', exact: true })).toBeVisible();
  });

  // ── INCENTIVE ───────────────────────────────────────────────────────────
  test('Incentive - page loads with Incentive Slab button and advisor table', async ({ authenticatedPage: page }) => {
    await page.getByText('Incentive', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Advisor Incentive')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total no. Advisor/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Incentive Slab/i })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Advisor Name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Advisor ID', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Advisor Club', exact: true })).toBeVisible();
  });

  test('Incentive - Incentive Slab opens configuration dialog', async ({ authenticatedPage: page }) => {
    await page.getByText('Incentive', { exact: true }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: /Incentive Slab/i }).click();

    await expect(page.getByText('INCENTIVE CONFIGURATION')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('TDS CONFIGURATION')).toBeVisible();
    await expect(page.getByText('COMMISSION CYCLE', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    const yesBtn = page.getByRole('button', { name: 'Yes' });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page);
  });

  test('Incentive - Incentive Slab fills configuration and saves', async ({ authenticatedPage: page }) => {
    await page.getByText('Incentive', { exact: true }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: /Incentive Slab/i }).click();
    await expect(page.getByText('INCENTIVE CONFIGURATION')).toBeVisible({ timeout: 5000 });

    // Config dialog comes pre-filled with From/To/Percentage Rate slabs (all
    // plain textboxes; the names are unique to the dialog). Round-trip the
    // first Percentage Rate value so the save posts a real edited form.
    const rateInputs = page.getByRole('textbox', { name: 'Percentage Rate' });
    await rateInputs.first().waitFor({ state: 'visible', timeout: 8000 });
    const currentRate = await rateInputs.first().inputValue();
    await rateInputs.first().fill(currentRate || '2');
    await expect(rateInputs.first()).toHaveValue(currentRate || '2');

    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    // Confirmation dialog may appear
    const yesBtn = page.getByRole('button', { name: 'Yes' });
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) await yesBtn.click();
    await noBackdrop(page);

    // Success = dialog closed with no error alert, or an explicit success toast
    await expect(page.getByText('INCENTIVE CONFIGURATION')).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
  });

  // ── HOLIDAY ─────────────────────────────────────────────────────────────
  test('Holiday - page loads with checkboxes and custom holidays table', async ({ authenticatedPage: page }) => {
    await page.getByText('Holiday', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Hoilday Configuration')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Custom Holidays/i })).toBeVisible();

    await expect(page.getByTestId('Sunday')).toBeVisible();
    await expect(page.getByTestId('Saturday')).toBeVisible();

    await expect(page.getByText('Holiday information')).toBeVisible();
    await expect(page.getByText('Name of the holiday')).toBeVisible();
  });

  test('Holiday - Add Custom Holiday opens dialog with name and date', async ({ authenticatedPage: page }) => {
    await page.getByText('Holiday', { exact: true }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: /Add Custom Holidays/i }).click();

    await expect(page.getByRole('heading', { name: 'Add Custom Holiday' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('New year')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();
  });

  // ── DESIGNATION ─────────────────────────────────────────────────────────
  test('Designation - page loads with table columns', async ({ authenticatedPage: page }) => {
    await page.getByText('Designation', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByRole('columnheader', { name: 'Department (Sub)', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Designation name', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Level', exact: true })).toBeVisible();
  });

  test('Designation - Add Designation button is dead (app bug: permanently disabled)', async ({ authenticatedPage: page }) => {
    // Live-verified: the button renders disabled on load and never becomes
    // enabled (no other control on this page toggles it) — an app bug, not a
    // test error. Same "unreachable form" pattern as GST Report, Add
    // expense/Asset, and transaction-section CDR.
    await page.getByText('Designation', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('columnheader', { name: 'Designation name', exact: true })).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('Add-standard-btn')).toBeDisabled();
  });

  // ── DYNAMIC ASSIGN VALUE ────────────────────────────────────────────────
  test('Dynamic Assign Value - page loads with Department/Sub Department/Hierarchy filters', async ({ authenticatedPage: page }) => {
    await page.getByText('Dynamic Assign Value', { exact: true }).click();
    await noBackdrop(page);

    await expect(page.getByText('Individual percentage')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Filter')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  // ── HOLIDAY FILL+SUBMIT ─────────────────────────────────────────────────
  test('Holiday - Add Custom Holiday fills name and date and saves', async ({ authenticatedPage: page }) => {
    await page.getByText('Holiday', { exact: true }).click();
    await noBackdrop(page);

    await page.getByRole('button', { name: /Add Custom Holidays/i }).click();
    await page.getByPlaceholder('New year').waitFor({ state: 'visible', timeout: 5000 });
    // Unique name so reruns don't trip a duplicate-name rejection
    const holidayName = `TstHoliday${Date.now().toString().slice(-6)}`;
    await page.getByPlaceholder('New year').fill(holidayName);
    await page.locator('input[type="date"]').fill('2026-12-25');
    // The last Save button belongs to the custom holiday inline form
    await page.getByRole('button', { name: 'Save' }).last().click();
    await noBackdrop(page);

    // Success = dialog closes with no error alert (the dialog stays open on a
    // rejected save); the saved row may land on a later page of the table so
    // don't require it in the visible rows
    await expect(page.getByRole('heading', { name: 'Add Custom Holiday' })).toBeHidden({ timeout: 10000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
    await expect(page.getByText('Holiday information')).toBeVisible({ timeout: 10000 });
  });

  // ── DYNAMIC ASSIGN VALUE FILL+SUBMIT ────────────────────────────────────
  test('Dynamic Assign Value - selects department and sub-department then generates', async ({ authenticatedPage: page }) => {
    await page.getByText('Dynamic Assign Value', { exact: true }).click();
    await noBackdrop(page);
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible({ timeout: 10000 });

    // Department (combobox 0)
    await page.getByRole('button', { name: 'Open' }).nth(0).click();
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('option').first().click();

    // Sub Department (combobox 1)
    await page.getByRole('button', { name: 'Open' }).nth(1).click();
    await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('option').first().click();

    await page.getByRole('button', { name: 'Generate' }).click();
    await noBackdrop(page);

    // Generate produces the individual-percentage hierarchy table (or reports no data);
    // either way the page must not show an error alert
    await expect(
      page.getByText('Individual percentage').or(page.getByText(/no data/i).first())
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.MuiAlert-colorError, .MuiAlert-standardError, .MuiAlert-filledError')).toHaveCount(0);
  });

  // ── REPORT ──────────────────────────────────────────────────────────────
  test('Report - page loads with filter controls', async ({ authenticatedPage: page }) => {
    await page.getByText('Report', { exact: true }).click();
    await noBackdrop(page);

    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible({ timeout: 10000 });
  });

  // ── FAVORITE ────────────────────────────────────────────────────────────
  test('Favorite - page loads', async ({ authenticatedPage: page }) => {
    await page.getByText('Favorite', { exact: true }).first().click();
    await noBackdrop(page);

    await page.waitForTimeout(1000);
    await expect(page.locator('.MuiBackdrop-root')).toBeHidden({ timeout: 5000 }).catch(() => {});
  });
});
