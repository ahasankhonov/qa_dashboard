import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

const PUBLIC_PATHS = ['/login'];
const API_PREFIX   = '/api';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never block API routes or Next.js internals
  if (pathname.startsWith(API_PREFIX) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE)?.value;

  // Already authenticated → bounce away from login
  if (session && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Not authenticated → redirect to login
  if (!session && !PUBLIC_PATHS.includes(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
