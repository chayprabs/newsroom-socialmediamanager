import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, shouldUseSecureCookies } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    path: '/',
    maxAge: 0,
  });

  return response;
}
