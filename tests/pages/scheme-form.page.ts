import { type Page, type Locator } from '@playwright/test';

export class SchemeFormPage {
  readonly page: Page;

  readonly schemeName: Locator;
  readonly chitValue: Locator;
  readonly noOfInstallment: Locator;
  readonly auctionType: Locator;
  readonly minimumBid: Locator;
  readonly maximumBid: Locator;
  readonly collectionOption: Locator;
  readonly enrollmentFees: Locator;
  readonly companyCommission: Locator;
  readonly companyTicket: Locator;
  readonly penaltyNps: Locator;
  readonly penaltyPs: Locator;
  readonly penaltySfPa: Locator;
  readonly minMemberForCC: Locator;
  readonly chitIconInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.schemeName = page.getByLabel('Scheme Name');
    this.chitValue = page.getByLabel('Chit value');
    this.noOfInstallment = page.getByLabel('No of installment');
    this.auctionType = page.getByLabel('Auction type');
    this.minimumBid = page.getByLabel('Minimum bid');
    this.maximumBid = page.getByLabel('Maximum bid');
    this.collectionOption = page.getByLabel('Collection option');
    this.enrollmentFees = page.getByLabel('Enrollment fees');
    this.companyCommission = page.getByLabel('Company commission');
    this.companyTicket = page.getByLabel('Company ticket');
    this.penaltyNps = page.getByLabel('Penalty NPS');
    this.penaltyPs = page.getByLabel('Penalty PS');
    this.penaltySfPa = page.getByLabel('Penalty SF P/A');
    this.minMemberForCC = page.getByLabel('Min member for C.C');
    this.chitIconInput = page.locator('input[type="file"]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.successToast = page.locator('.MuiSnackbar-root');
  }

  async selectAuctionType(option: string) {
    await this.auctionType.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async selectCollectionOption(option: string) {
    await this.collectionOption.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }
}
