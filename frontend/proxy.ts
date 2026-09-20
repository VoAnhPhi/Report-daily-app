import { NextResponse } from 'next/server';

/**
 * The standalone app has no maintenance gate or device-specific redirects.
 * Page access is handled by the feature API and the login session.
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
