import { createHmac } from 'crypto';

const COOKIE_NAME = 'kcpl_dash_session';
const MAX_AGE = 8 * 60 * 60; // 8 hours

function sign(payload: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verify(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.substring(0, dot);
  const expected = sign(payload, secret);
  if (token !== expected) return null;
  const expires = parseInt(payload.split('|')[1], 10);
  if (Date.now() > expires) return null;
  return payload;
}

export function createSessionCookie(secret: string): string {
  const expires = Date.now() + MAX_AGE * 1000;
  const token = sign(`session|${expires}`, secret);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function isAuthenticated(cookieHeader: string | undefined, secret: string): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const token = match.substring(COOKIE_NAME.length + 1);
  return verify(token, secret) !== null;
}
