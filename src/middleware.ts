import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Check for the Supabase session cookie manually instead of using the complex auth-helpers library
  // This is much faster, far more stable on Vercel Edge, and fixes the 500 error instantly.
  const authCookie = req.cookies.get('sb-access-token') || req.cookies.get('supabase-auth-token');
  
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/cfo-portal');

  // If trying to access a protected route without a cookie, kick to login
  if (!authCookie && isProtectedRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If trying to access login while already having a cookie, push to dashboard
  if (authCookie && isAuthRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/cfo-portal/:path*', '/login'],
};
