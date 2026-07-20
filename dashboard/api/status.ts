import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from './_auth';

const ALLURE_URL = 'https://kcpl-automation-suite.vercel.app';

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
    return res.status(500).json({ error: 'Server misconfigured — no GITHUB_PAT' });
  }

  const triggeredAt = parseInt(req.query.triggeredAt as string, 10);
  if (!triggeredAt) {
    return res.status(400).json({ error: 'Missing triggeredAt query param' });
  }

  const ghRes = await fetch(
    'https://api.github.com/repos/Hem2006/KCPL-Automation-Suite/actions/runs?event=workflow_dispatch&per_page=5',
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!ghRes.ok) {
    const body = await ghRes.text();
    return res.status(ghRes.status).json({ error: 'GitHub API error', body });
  }

  const data = await ghRes.json();
  const runs = data.workflow_runs ?? [];

  const run = runs.find((r: any) => {
    const created = new Date(r.created_at).getTime();
    return created >= triggeredAt - 10000;
  });

  if (!run) {
    return res.status(200).json({
      found: false,
      status: 'waiting',
      message: 'Run not created yet — GitHub may take a few seconds to queue it.',
    });
  }

  return res.status(200).json({
    found: true,
    status: run.status,
    conclusion: run.conclusion,
    html_url: run.html_url,
    run_number: run.run_number,
    allure_url: ALLURE_URL,
  });
}
