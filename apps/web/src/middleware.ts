import { type NextRequest, NextResponse } from 'next/server';

const H2H_PATH = /^\/h2h\/[^/]+\/[^/]+\/?$/;

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/rank/')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  // /h2h/<a>/<b> is served by the static /h2h shell; the view parses the ids
  // from window.location.pathname. Sidesteps a next-on-pages bug where the
  // edge-runtime dynamic route's RSC flight payload is chunked mid-string,
  // breaking the JS parser at hydration (issue #194).
  if (H2H_PATH.test(req.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL('/h2h', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/rank/:path*', '/h2h/:path*'],
};
