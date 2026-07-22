import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from './_auth';

const REPO = 'Hem2006/KCPL-Automation-Suite';
const SPEC_DIR = 'tests/smoke';

const SPEC_FILES = [
  '01-login.spec.ts',
  '02-navigation.spec.ts',
  '03-creation.spec.ts',
  '04-receipt.spec.ts',
  '05-auction.spec.ts',
  '06-guarantor.spec.ts',
  '07-payment-voucher.spec.ts',
  '08-paid-voucher.spec.ts',
  '09-collection.spec.ts',
  '10-report.spec.ts',
  '11-accounts-creation.spec.ts',
  '12-accounts-transaction.spec.ts',
  '13-accounts-report.spec.ts',
  '14-hr.spec.ts',
  '15-audit.spec.ts',
  '16-legal.spec.ts',
];

function parseTestNames(source: string): string[] {
  const names: string[] = [];
  const regex = /test\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.COOKIE_SECRET;
  if (!secret || !isAuthenticated(req.headers.cookie, secret)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const specFile = req.query.file as string | undefined;
  const files = specFile ? [specFile] : SPEC_FILES;

  const results: Record<string, string[]> = {};

  await Promise.all(
    files.map(async (file) => {
      const url = `https://api.github.com/repos/${REPO}/contents/${SPEC_DIR}/${file}`;
      const ghRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (!ghRes.ok) return;
      const source = await ghRes.text();
      results[file] = parseTestNames(source);
    })
  );

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  return res.status(200).json(results);
}
