import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { createSessionCookie, clearSessionCookie } from './_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const { rows } = await sql`SELECT password_hash FROM users WHERE username = ${username}`;

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, rows[0].password_hash);

  if (valid) {
    res.setHeader('Set-Cookie', createSessionCookie(secret));
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(401).json({ error: 'Invalid credentials' });
}
