import { type Page, type Locator } from '@playwright/test';

export class SidebarPage {
  readonly page: Page;

  // Top-level links (real <a> tags)
  readonly dashboardLink: Locator;
  readonly receiptLink: Locator;

  // Top-level nav buttons (div role="button")
  readonly creationButton: Locator;
  readonly auctionButton: Locator;
  readonly guarantorButton: Locator;
  readonly paymentVoucherButton: Locator;
  readonly paidVoucherButton: Locator;
  readonly collectionButton: Locator;
  readonly reportButton: Locator;
  readonly favoriteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    this.receiptLink = page.getByRole('link', { name: 'Receipt' });
    this.creationButton = page.getByRole('button', { name: 'Creation' });
    this.auctionButton = page.getByRole('button', { name: 'Auction', exact: true });
    this.guarantorButton = page.getByRole('button', { name: 'Guarantor details' });
    this.paymentVoucherButton = page.getByRole('button', { name: 'Payment voucher' });
    this.paidVoucherButton = page.getByRole('button', { name: 'Paid voucher List' });
    this.collectionButton = page.getByRole('button', { name: 'Collection' });
    this.reportButton = page.getByRole('button', { name: 'Report' });
    this.favoriteButton = page.getByRole('button', { name: 'Favorite' });
  }

  allNavItems(): Locator[] {
    return [
      this.dashboardLink,
      this.receiptLink,
      this.creationButton,
      this.auctionButton,
      this.guarantorButton,
      this.paymentVoucherButton,
      this.paidVoucherButton,
      this.collectionButton,
      this.reportButton,
      this.favoriteButton,
    ];
  }

  navItemNames(): string[] {
    return [
      'Dashboard', 'Receipt', 'Creation', 'Auction',
      'Guarantor details', 'Payment voucher', 'Paid voucher List',
      'Collection', 'Report', 'Favorite',
    ];
  }

  // Submenu items — click the parent first, then the child
  submenu(parentName: string, childName: string): Locator {
    return this.page.getByRole('button', { name: childName });
  }

  async navigateToSubmenu(parentButton: Locator, childName: string) {
    await parentButton.click();
    const child = this.page.getByRole('button', { name: childName });
    await child.waitFor({ state: 'visible', timeout: 5000 });
    await child.click();
  }
}
