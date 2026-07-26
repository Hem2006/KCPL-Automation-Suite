import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const setupKey = process.env.SETUP_KEY;
  if (!setupKey) {
    return res.status(500).json({ error: 'SETUP_KEY not configured' });
  }

  const { key } = req.body ?? {};
  if (key !== setupKey) {
    return res.status(403).json({ error: 'Invalid setup key' });
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const dashboardUsername = process.env.DASHBOARD_USERNAME;
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  if (!dashboardUsername || !dashboardPassword) {
    return res.status(500).json({ error: 'DASHBOARD_USERNAME/DASHBOARD_PASSWORD not configured' });
  }

  const hash = await bcrypt.hash(dashboardPassword, 10);

  await sql`
    INSERT INTO users (username, password_hash)
    VALUES (${dashboardUsername}, ${hash})
    ON CONFLICT (username) DO UPDATE SET password_hash = ${hash}
  `;

  return res.status(200).json({ ok: true, message: 'Table created and user seeded' });
}
