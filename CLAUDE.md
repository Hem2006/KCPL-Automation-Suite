# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
npm install
npx playwright install chromium

# Run all smoke tests (headless)
npm test

# Run only @smoke tagged tests
npm run test:smoke

# Watch the browser while running (slowMo=800ms)
npm run test:headed

# Step through a single test interactively
npm run test:debug

# Run a single spec file
npx playwright test tests/smoke/10-report.spec.ts

# Run a single test by name
npx playwright test --grep "enrollment page"

# Open Allure report after a run
npm run allure:report

# Open HTML report after a run
npm run report
```

## Architecture

The suite is a **Page Object Model** with a shared auth fixture. Every test file goes through the same path:

```
test file → auth.fixture.ts (auto-login) → page object (locators) → assertions
```

**Layer responsibilities:**
- `tests/pages/` — locators and actions only, no assertions
- `tests/fixtures/auth.fixture.ts` — logs in, waits for the MUI backdrop overlay to clear, then exposes `authenticatedPage` (a logged-in `Page`) and `sidebar` (a `SidebarPage`) to every test that requests them
- `tests/smoke/` — assertion logic lives here; each spec imports from the auth fixture, not from `@playwright/test` directly
- `tests/healing/healer.ts` — `Healer.find(primary, fallbacks[])` tries selectors in order; reports to Healenium if `HEALING_ENABLED=true`

## Target app facts

- URL: `https://dev.mykcpl.com/admin/index.html` — credentials `kcpl / kcpl`
- SPA with `#/` hash routing. `baseURL` is `https://dev.mykcpl.com`; `goto('/admin/index.html')` is the correct entry point
- MUI React — a loading `MuiBackdrop-root` overlay appears after login and between navigations; always wait for it with `.waitFor({ state: 'hidden' }).catch(() => {})` before clicking sidebar items
- Sidebar: `Dashboard` and `Receipt` are real `<a>` elements → use `getByRole('link')`; all other top-level items are `<div role="button">` → use `getByRole('button')`
- Full sidebar order: Dashboard, Receipt, Creation, Auction, Guarantor details, Payment voucher, Paid voucher List, Collection, Report, Favorite, **Accounts Operation**, HR, Audit, Legal. The last four sit below the fold in the CI viewport (1600x900) and need `scrollIntoViewIfNeeded()` before clicking (see spec files 11-16 and [MUI Interaction Gotchas] in memory)
- Submenu items are plain text elements (not buttons) → use `getByText(name, { exact: true })`
- App has intentional typos that must be matched exactly: `"Aprove guarantor"`, `"Group Bussiness"`, `"directReciept"` (in the URL)

## beforeEach pattern for sections with submenus

Every spec file for a sidebar section with submenus must follow this exact pattern:

```typescript
test.beforeEach(async ({ authenticatedPage: page, sidebar }) => {
  await sidebar.sectionButton.waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await sidebar.sectionButton.click({ timeout: 20000 });
  // Wait for the FIRST submenu item to confirm the menu is fully open
  await page.getByText('First Submenu Item', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
});
```

Then in each test, after clicking the submenu item, always wait for the backdrop again:

```typescript
test('...', async ({ authenticatedPage: page }) => {
  await page.getByText('Submenu Item', { exact: true }).click();
  await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  // now assert
});
```

**Critical:** For `10-report.spec.ts` (which runs after many other tests), wait for the backdrop BEFORE calling `sidebar.reportButton.waitFor`, and use a 25000ms timeout:

```typescript
await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
await sidebar.reportButton.waitFor({ state: 'visible', timeout: 25000 });
```

## Selector gotchas

- **Strict mode violations** are common. `getByRole('columnheader', { name: 'Name' })` matches both "Name" and "Agent Name". Always add `{ exact: true }` when the label is a substring of another label.
- **`getByText` substring matching**: `getByText('Sb Paid List')` matches both the `h4` heading and `h6` subtitle that contains "Total Sb Paid List". Always use `{ exact: true }` when the text could be a substring of another visible element's text.
- `getByRole('heading')` can match multiple `<h5>` / `<h6>` elements on the same page — use `{ exact: true }` or `getByTestId()` to disambiguate.
- `getByRole('button', { name: 'AUCTION' })` on the Processing List page also matches the sidebar "Auction" `<div role="button">` — use `getByTestId('Auction')` for the toggle button.
- `#download` exists on most report pages but **not** on Member List or Website Enquiry Report.
- The sidebar `Report` button uses `data-testid="Button-ListIiteo"` (a typo in the app); use `getByRole('button', { name: 'Report' })` which resolves correctly.
- **MUI DataGrid column virtualization**: columns scrolled out of the initial viewport are not in the DOM. Only assert on the first ~7 visible columns. Off-screen columns like "Prized Amount", "Liability" will not be found even if they exist.
- **Toggle buttons with no accessible names**: some MUI button groups render without accessible names (e.g., toggle buttons on Paid voucher List pages). Use `getByRole('columnheader', { name: '...', exact: true })` as the page-load anchor instead of asserting on the buttons.

## Form submission requirement

Every Add / Create / Save form in the app **must** have a test that fills all fields and submits. Cancel-only or visibility-only tests are incomplete. For every form:

1. Fill all required text/dropdown/checkbox fields with realistic dummy data
2. Click the submit button (Save, Save & confirm, Next → Save, etc.)
3. Assert the success outcome — toast message, redirect to list, or list count change
4. File upload fields may be skipped when no test asset is available, but all other fields must be filled

This applies to multi-step flows too: complete every step and assert on the final save.

## Known app bugs (match these exactly)

- **Repayment Paid List** page shows the heading `"Sb Paid List"` (same as the Sb & Asb page) — this is an app bug, not a test error. Assert on column headers instead of the heading for this page.

## Spec files

Specs run in numeric order (01 → 10). All are tagged `@smoke`.

| File | Section | Sub-pages | Tests |
|---|---|---|---|
| `01-login.spec.ts` | Login | — | 4 |
| `02-navigation.spec.ts` | Sidebar nav | — | 4 |
| `03-creation.spec.ts` | Creation | Scheme, Group, Generate payable | ~12 |
| `04-receipt.spec.ts` | Receipt | — | 1 |
| `05-auction.spec.ts` | Auction | Post auction, Live auction, Sb list | 3 |
| `06-guarantor.spec.ts` | Guarantor details | Add guarantor, Aprove guarantor, Secondary Approval | 15 |
| `07-payment-voucher.spec.ts` | Payment voucher | Sb & Asb, Repayment, Other | 13 |
| `08-paid-voucher.spec.ts` | Paid voucher List | Sb & Asb Paid List, Repayment Paid List, Other Paid List | 12 |
| `09-collection.spec.ts` | Collection | Due list, Unsettle Report, Settle Report, Agent Transfer | 4 |
| `10-report.spec.ts` | Report | Enrollment, Request Information, Group Bussiness, Agreement, Member List, Website Enquiry, Processing List | 7 |
| `11-accounts-creation.spec.ts` | Accounts Operation → Creation | Add vendor, Group & Ledger creation | ~15 |
| `12-accounts-transaction.spec.ts` | Accounts Operation → Transaction | Add FD, vouchers | ~13 |
| `13-accounts-report.spec.ts` | Accounts Operation → Report | Cash in hand, Petty cash | ~4 |
| `14-hr.spec.ts` | HR | Employee Creation | ~6 |
| `15-audit.spec.ts` | Audit | Scheme | ~2 |
| `16-legal.spec.ts` | Legal | Dashboard, Legal Prospect Report, SF Case Wise Report, SF Subscriber Wise Report, Subscriber Information, Favorite | 15 |

## Report sub-pages (all under the Report sidebar section)

| Sub-page | Key identifiers |
|---|---|
| Enrollment | heading "Enrollment List", `#download`, Enrollment List / Deleted list toggle tabs |
| Request Information | heading "Request information" (lowercase i), Mobile / Admin toggle buttons |
| Group Bussiness | heading "Group Bussiness" (typo), `#download` |
| Agreement | heading "Agreement list", `#download` |
| Member List | `getByText(/Total Member List/)` — no `#download` |
| Website Enquiry Report | `getByText(/Total Chit Plan Enquiry/)` — no `#download`, table shows "No rows" (empty) |
| Processing List | heading "Processing List" + `exact: true`, `getByTestId('Enrollment'|'Receipt'|'Auction'|'Payment')` for toggles |

## Healenium (optional)

Requires Docker. Start with `npm run healenium:up` (PostgreSQL + backend on port 7878), then run tests with `HEALING_ENABLED=true npm test`. The `Healer` class in `tests/healing/healer.ts` is not wired into the smoke tests by default — import and use it manually when writing tests that need fallback selectors.

## CI

`.github/workflows/test.yml` triggers on push to `main`/`master`, nightly at 23:00 UTC, and on `workflow_dispatch`. Uploads HTML report (30-day) and test results (14-day) as artifacts. All tests are tagged `@smoke` in their `describe` block name.
