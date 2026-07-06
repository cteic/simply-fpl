import { type NextRequest, NextResponse } from 'next/server';

const H2H_PATH = /^\/h2h\/[^/]+\/[^/]+\/?$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/rank/')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (pathname === '/threats' || pathname.startsWith('/threats/')) {
    return NextResponse.redirect(new URL('/#threats', req.url));
  }
  if (pathname === '/effective-ownership' || pathname.startsWith('/effective-ownership/')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (pathname === '/rivals' || pathname.startsWith('/rivals/')) {
    return NextResponse.redirect(new URL('/#rivals', req.url));
  }
  // /h2h/<a>/<b> is served by the static /h2h shell; the view parses the ids
  // from window.location.pathname. Sidesteps a next-on-pages bug where the
  // edge-runtime dynamic route's RSC flight payload is chunked mid-string,
  // breaking the JS parser at hydration (issue #194).
  if (H2H_PATH.test(pathname)) {
    return NextResponse.rewrite(new URL('/h2h', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/rank/:path*',
    '/threats',
    '/threats/:path*',
    '/effective-ownership',
    '/effective-ownership/:path*',
    '/rivals',
    '/rivals/:path*',
    '/h2h/:path*',
  ],
};
