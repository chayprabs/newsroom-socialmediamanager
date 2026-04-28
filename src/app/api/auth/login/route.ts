import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  shouldUseSecureCookies,
} from '@/lib/session';

export const runtime = 'nodejs';

function hash(value: string) {
  return createHash('sha256').update(value).digest();
}

function safeEquals(actual: string, expected: string) {
  return timingSafeEqual(hash(actual), hash(expected));
}

export async function POST(request: NextRequest) {
  const expectedUsername = process.env.NEWSROOM_USERNAME;
  const expectedPassword = process.env.NEWSROOM_PASSWORD;

  if (!expectedUsername || !expectedPassword || !process.env.NEWSROOM_SESSION_SECRET) {
    return NextResponse.json({ error: 'Auth is not configured.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!safeEquals(username, expectedUsername) || !safeEquals(password, expectedPassword)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
