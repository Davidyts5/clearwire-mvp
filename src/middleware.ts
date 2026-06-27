import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DashboardRoutes, Role } from './lib/roles'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  // 1. ABSOLUTE TIME-BOMB COOKIE DESTRUCTION
  // Even if Supabase tries to send a fresh token, we forcefully intercept the cookie setter
  // and inject an absolute expiration time of 60 minutes from THIS EXACT MILLISECOND.
  // Because it is an HTTP-Only cookie, the mobile OS browser itself will physically 
  // delete the cookie when the clock hits the 60 minute mark, regardless of whether 
  // the app is minimized, frozen, or in the background.
  const STRICT_EXPIRATION_SECONDS = 3600; 

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          const strictOptions = { 
            ...options, 
            maxAge: STRICT_EXPIRATION_SECONDS,
            expires: new Date(Date.now() + (STRICT_EXPIRATION_SECONDS * 1000)) // Explicitly set the hard Date object for mobile Safari/Chrome compatibility
          };
          
          request.cookies.set({ name, value, ...strictOptions })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...strictOptions })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isInviteRoute = request.nextUrl.pathname.startsWith('/invite')
  const isProtectedBase = 
    request.nextUrl.pathname.startsWith('/clerk-dashboard') ||
    request.nextUrl.pathname.startsWith('/controller-dashboard') ||
    request.nextUrl.pathname.startsWith('/cfo-dashboard') ||
    request.nextUrl.pathname.startsWith('/auditor-dashboard') ||
    request.nextUrl.pathname.startsWith('/approve');

  if (!session && isProtectedBase && !isInviteRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!session) return response;

  const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  const role = userData?.role as Role;

  const targetDashboard = DashboardRoutes[role] || '/login';

  if (request.nextUrl.pathname.startsWith('/clerk-dashboard') && role !== 'clerk') return NextResponse.redirect(new URL(targetDashboard, request.url));
  if (request.nextUrl.pathname.startsWith('/controller-dashboard') && role !== 'controller') return NextResponse.redirect(new URL(targetDashboard, request.url));
  if (request.nextUrl.pathname.startsWith('/cfo-dashboard') && role !== 'cfo') return NextResponse.redirect(new URL(targetDashboard, request.url));
  if (request.nextUrl.pathname.startsWith('/auditor-dashboard') && role !== 'auditor') return NextResponse.redirect(new URL(targetDashboard, request.url));

  if (request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/cfo-portal') {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|images|images).*)'],
};
