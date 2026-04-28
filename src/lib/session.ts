import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE_NAME = 'newsroom_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

function getSessionSecret() {
  const secret = process.env.NEWSROOM_SESSION_SECRET;

  if (!secret) {
    throw new Error('NEWSROOM_SESSION_SECRET is not configured.');
  }

  return encoder.encode(secret);
}

export async function createSessionToken() {
  return new SignJWT({ scope: 'newsroom' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token?: string) {
  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload.scope === 'newsroom';
  } catch {
    return false;
  }
}

export function shouldUseSecureCookies() {
  return process.env.NEWSROOM_COOKIE_SECURE === '1' || Boolean(process.env.VERCEL);
}
