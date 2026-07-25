import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from './_auth';

const VALID_SPECS = [
  'all',
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.COOKIE_SECRET;
  if (!secret || !isAuthenticated(req.headers.cookie, secret)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return res.status(500).json({ error: 'Server misconfigured — no GITHUB_PAT' });
  }

  const { selections } = req.body ?? {};
  if (!Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({ error: 'selections must be a non-empty array' });
  }

  const cleaned: { specFile: string; testNames: string[] }[] = [];
  for (const sel of selections) {
    const specFile = sel?.specFile;
    if (typeof specFile !== 'string' || !VALID_SPECS.includes(specFile)) {
      return res.status(400).json({ error: 'Invalid spec file', valid: VALID_SPECS });
    }
    const testNames = Array.isArray(sel?.testNames)
      ? sel.testNames.filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0)
      : [];
    cleaned.push({ specFile, testNames });
  }

  // "all" (the full suite) supersedes every other selection.
  const finalSelections = cleaned.some((s) => s.specFile === 'all')
    ? [{ specFile: 'all', testNames: [] }]
    : cleaned;

  const triggeredAt = Date.now();

  const inputs: Record<string, string> = { selections: JSON.stringify(finalSelections) };

  const ghRes = await fetch(
    'https://api.github.com/repos/Hem2006/KCPL-Automation-Suite/actions/workflows/test.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs,
      }),
    }
  );

  if (ghRes.status === 204) {
    return res.status(200).json({ ok: true, triggeredAt });
  }

  const body = await ghRes.text();
  return res.status(ghRes.status).json({ error: 'GitHub API error', status: ghRes.status, body });
}
