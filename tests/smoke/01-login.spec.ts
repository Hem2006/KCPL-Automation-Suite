import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { tagAllure } from '../helpers/allure-tags';

test.describe('Login - Smoke @smoke', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }, testInfo) => {
    await tagAllure(testInfo, 'Login', [['', 'Login']]);
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('login page loads with all elements', async () => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test('password visibility toggle works', async () => {
    await loginPage.passwordInput.fill('testpass');
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await loginPage.passwordToggle.click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
  });

  test('successful login navigates to dashboard', async ({ page }) => {
    await loginPage.login('kcpl', 'kcpl');
    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(page.getByText('KCPL Company')).toBeVisible();
  });

  test('footer links are visible', async () => {
    await expect(loginPage.page.getByText('About us')).toBeVisible();
    await expect(loginPage.page.getByText('Our Mission and Vision')).toBeVisible();
    await expect(loginPage.page.getByText('Contact us')).toBeVisible();
  });
});
