import type { Reporter, FullConfig, Suite, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';

class SummaryReporter implements Reporter {
  private suite!: Suite;

  onBegin(_config: FullConfig, suite: Suite) {
    this.suite = suite;
  }

  onEnd(_result: FullResult) {
    let passed = 0;
    let failed = 0;
    let flaky = 0;
    let skipped = 0;

    const walk = (suite: Suite) => {
      for (const test of suite.tests) {
        switch (test.outcome()) {
          case 'expected': passed++; break;
          case 'unexpected': failed++; break;
          case 'flaky': flaky++; break;
          case 'skipped': skipped++; break;
        }
      }
      for (const child of suite.suites) walk(child);
    };
    walk(this.suite);

    fs.writeFileSync('test-summary.json', JSON.stringify({ passed, failed, flaky, skipped }, null, 2));
  }
}

export default SummaryReporter;
