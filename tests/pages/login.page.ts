import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly passwordToggle: Locator;
  readonly forgotPasswordLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[placeholder="Enter your username"]');
    this.passwordInput = page.locator('input[placeholder="Enter your password"]');
    this.loginButton = page.locator('button[type="submit"]', { hasText: 'Login' });
    this.passwordToggle = page.locator('button[type="button"]');
    this.forgotPasswordLink = page.locator('a[href="#/"]');
    this.heading = page.getByText('HIGH SECURED LOGIN');
  }

  async goto() {
    await this.page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());

    // The app's permission check reads localStorage.getItem('userName') and
    // localStorage.getItem('permissions'). In a fresh CI browser both are null,
    // causing n.includes() to throw on undefined. Pre-seeding userName makes
    // the short-circuit fire so React can mount before login happens.
    await this.page.addInitScript(() => {
      if (!localStorage.getItem('userName')) {
        localStorage.setItem('userName', 'kcpl');
      }
    });

    await this.page.goto('/admin/index.html');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.usernameInput.waitFor({ state: 'visible', timeout: 20000 });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL(/#\/dashboard/, { timeout: 20000 });
  }
}
