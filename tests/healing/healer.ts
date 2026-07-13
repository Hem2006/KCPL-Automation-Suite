import { type Page, type Locator } from '@playwright/test';

const HEALENIUM_URL = process.env.HEALENIUM_URL || 'http://localhost:7878';

interface SelectorRecord {
  id: string;
  locator: string;
  className: string;
  tag: string;
  innerText: string;
}

export class Healer {
  private page: Page;
  private enabled: boolean;

  constructor(page: Page) {
    this.page = page;
    this.enabled = process.env.HEALING_ENABLED === 'true';
  }

  async find(primary: string, fallbacks: string[] = []): Promise<Locator> {
    const loc = this.page.locator(primary);
    if ((await loc.count()) > 0) {
      if (this.enabled) await this.report(primary, primary, true);
      return loc.first();
    }

    for (const fb of fallbacks) {
      const fbLoc = this.page.locator(fb);
      if ((await fbLoc.count()) > 0) {
        console.warn(`[HEALER] Primary "${primary}" broken. Healed with: "${fb}"`);
        if (this.enabled) await this.report(primary, fb, false);
        return fbLoc.first();
      }
    }

    throw new Error(`[HEALER] All selectors failed for primary: ${primary}`);
  }

  private async report(original: string, used: string, matched: boolean) {
    try {
      await fetch(`${HEALENIUM_URL}/healing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locator: original,
          healedLocator: used,
          pageUrl: this.page.url(),
          matched,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Healenium server not available — continue without reporting
    }
  }
}
