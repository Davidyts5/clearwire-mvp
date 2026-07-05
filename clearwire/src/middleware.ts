import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DashboardRoutes, Role } from './lib/roles'
import { NAVIGATION_CONFIG } from './config/navigation'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })
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
            expires: new Date(Date.now() + (STRICT_EXPIRATION_SECONDS * 1000)) 
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

  const path = request.nextUrl.pathname;
  if (path === '/') return response;

  const isAuthRoute = path.startsWith('/login');
  const isInviteRoute = path.startsWith('/invite');
  
  // Public static assets
  if (path.startsWith('/_next') || path.startsWith('/api') || path.includes('.')) return response;

  // 1. Unauthenticated users hitting protected routes
  if (!session && !isAuthRoute && !isInviteRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!session) return response;

  // 2. Extract Role
  const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  const role = userData?.role as Role;
  const targetDashboard = DashboardRoutes[role] || '/login';

  // 3. Centralized Route Protection Mapping
  const routePermissions: Record<string, Role[]> = {
    '/clerk-dashboard': ['clerk'],
    '/controller-dashboard': ['controller'],
    '/cfo-dashboard': ['cfo'],
    '/auditor-dashboard': ['auditor'],
    '/executive': ['cfo'],
    '/approvals': ['controller'],
    '/team': ['cfo'],
    '/settings': ['cfo'],
    '/audit': ['cfo', 'auditor'],
    '/reports': ['auditor'],
    '/vendors': ['clerk', 'controller', 'cfo'],
    '/profile': ['clerk', 'controller', 'cfo', 'auditor'],
    '/approve': ['clerk', 'controller', 'cfo', 'auditor'], 
  };

  // Find required roles for current route
  let requiredRoles: Role[] | null = null;
  for (const [route, roles] of Object.entries(routePermissions)) {
    if (path.startsWith(route)) {
      requiredRoles = roles as Role[];
      break;
    }
  }

  // If route is protected and user role is not allowed, redirect to dashboard
  if (requiredRoles && !requiredRoles.includes(role)) {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  // Handle Dynamic `/dashboard` link -> redirect to their actual dashboard
  if (path === '/dashboard') {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|images).*)'],
};
