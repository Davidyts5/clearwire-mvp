import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DashboardRoutes, Role } from './lib/roles';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
  const isInviteRoute = request.nextUrl.pathname.startsWith('/invite');
  const isProtectedBase = 
    request.nextUrl.pathname.startsWith('/clerk-dashboard') ||
    request.nextUrl.pathname.startsWith('/controller-dashboard') ||
    request.nextUrl.pathname.startsWith('/cfo-dashboard') ||
    request.nextUrl.pathname.startsWith('/auditor-dashboard') ||
    request.nextUrl.pathname.startsWith('/approve');

  // Handle Unauthenticated
  if (!user && isProtectedBase && !isInviteRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) return response;

  // Handle Authenticated Route Protection
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  const role = userData?.role as Role;

  const targetDashboard = DashboardRoutes[role] || '/login';

  // Prevent users from accessing dashboards that don't belong to their role
  if (request.nextUrl.pathname.startsWith('/clerk-dashboard') && role !== 'clerk') return NextResponse.redirect(new URL(targetDashboard, request.url));
  if (request.nextUrl.pathname.startsWith('/controller-dashboard') && role !== 'controller') return NextResponse.redirect(new URL(targetDashboard, request.url));
  if (request.nextUrl.pathname.startsWith('/cfo-dashboard') && role !== 'cfo') return NextResponse.redirect(new URL(targetDashboard, request.url));
  if (request.nextUrl.pathname.startsWith('/auditor-dashboard') && role !== 'auditor') return NextResponse.redirect(new URL(targetDashboard, request.url));

  // Legacy route redirections to new structure
  if (request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/cfo-portal') {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|images|images).*)'],
};
