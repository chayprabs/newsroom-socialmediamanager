import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/session';

const PUBLIC_FILE_PATTERN = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === '/';
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasValidSession = await verifySessionToken(sessionToken);

  if (isLoginPage && hasValidSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isLoginPage && !hasValidSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
