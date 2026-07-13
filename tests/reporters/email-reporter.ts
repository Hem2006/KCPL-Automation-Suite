import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

interface FailedTest {
  title: string;
  file: string;
}

class EmailReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private failedTests: FailedTest[] = [];
  private startTime = Date.now();

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') {
      this.passed++;
    } else if (result.status === 'skipped') {
      this.skipped++;
    } else {
      this.failed++;
      const filePath = test.location.file;
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
      this.failedTests.push({ title: test.title, file: fileName });
    }
  }

  async onEnd(_result: FullResult) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const durationMs = Date.now() - this.startTime;
    const durationMins = Math.floor(durationMs / 60000);
    const durationSecs = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${durationMins}m ${durationSecs.toString().padStart(2, '0')}s`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const timeStr = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });

    const total = this.passed + this.failed + this.skipped;
    const status = this.failed === 0 ? 'ALL PASSED' : `${this.failed} FAILED`;
    const subject = `KCPL Test Run — ${status} — ${dateStr}`;

    const divider = '━'.repeat(60);
    const thinDivider = '─'.repeat(60);

    let body = '';
    body += `${divider}\n`;
    body += `  KCPL Admin — Automated Test Report\n`;
    body += `  ${dateStr}  |  ${timeStr} UTC  |  Duration: ${durationStr}\n`;
    body += `${divider}\n`;
    body += `\n`;
    body += `  SUMMARY\n`;
    body += `  ┌${'─'.repeat(15)}┬${'─'.repeat(9)}┐\n`;
    body += `  │ ${'Total'.padEnd(13)} │ ${String(total).padStart(7)} │\n`;
    body += `  │ ${'✅ Passed'.padEnd(13)} │ ${String(this.passed).padStart(7)} │\n`;
    body += `  │ ${'❌ Failed'.padEnd(13)} │ ${String(this.failed).padStart(7)} │\n`;
    body += `  │ ${'⏭ Skipped'.padEnd(13)} │ ${String(this.skipped).padStart(7)} │\n`;
    body += `  └${'─'.repeat(15)}┴${'─'.repeat(9)}┘\n`;
    body += `\n`;
    body += `${divider}\n`;
    body += `\n`;

    if (this.failedTests.length > 0) {
      const nameWidth = 52;
      const fileWidth = 26;

      body += `  FAILED TESTS\n`;
      body += `  ┌${'─'.repeat(4)}┬${'─'.repeat(nameWidth + 2)}┬${'─'.repeat(fileWidth + 2)}┐\n`;
      body += `  │ ${'#'.padEnd(2)} │ ${'Test Name'.padEnd(nameWidth)} │ ${'File'.padEnd(fileWidth)} │\n`;
      body += `  ├${'─'.repeat(4)}┼${'─'.repeat(nameWidth + 2)}┼${'─'.repeat(fileWidth + 2)}┤\n`;

      this.failedTests.forEach((t, i) => {
        const num = String(i + 1).padStart(2, '0');
        const title = t.title.length > nameWidth
          ? t.title.slice(0, nameWidth - 1) + '…'
          : t.title.padEnd(nameWidth);
        const file = t.file.length > fileWidth
          ? t.file.slice(0, fileWidth - 1) + '…'
          : t.file.padEnd(fileWidth);
        body += `  │ ${num} │ ${title} │ ${file} │\n`;
      });

      body += `  └${'─'.repeat(4)}┴${'─'.repeat(nameWidth + 2)}┴${'─'.repeat(fileWidth + 2)}┘\n`;
      body += `\n`;
    } else {
      body += `  No failures. All tests passed.\n\n`;
    }

    body += `${divider}\n`;
    body += `  Sent by KCPL Test Pipeline  |  github.com/Hem2006/KCPL-Automation-Suite\n`;
    body += `${divider}\n`;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KCPL Tests <onboarding@resend.dev>',
          to: ['hemindukuru@gmail.com'],
          subject,
          text: body,
        }),
      });
      console.log('\n[EMAIL] Test report sent to hemindukuru@gmail.com');
    } catch (err) {
      console.error('[EMAIL] Failed to send report:', err);
    }
  }
}

export default EmailReporter;
