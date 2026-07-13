import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { SidebarPage } from '../pages/sidebar.page';

type AuthFixtures = {
  authenticatedPage: Page;
  sidebar: SidebarPage;
};

type AuthWorkerFixtures = {
  sharedContext: BrowserContext;
  sharedPage: Page;
};

export const test = base.extend<AuthFixtures, AuthWorkerFixtures>({
  sharedContext: [async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  }, { scope: 'worker' }],

  sharedPage: [async ({ sharedContext }, use) => {
    const page = await sharedContext.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('kcpl', 'kcpl');
    await page.locator('.MuiBackdrop-root').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await use(page);
  }, { scope: 'worker' }],

  authenticatedPage: async ({ sharedPage }, use) => {
    await use(sharedPage);
  },

  sidebar: async ({ authenticatedPage }, use) => {
    await use(new SidebarPage(authenticatedPage));
  },
});

export { expect } from '@playwright/test';
