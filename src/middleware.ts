import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isCfoPortal = request.nextUrl.pathname.startsWith('/cfo-portal')
  const isApprove = request.nextUrl.pathname.startsWith('/approve')
  const isInviteRoute = request.nextUrl.pathname.startsWith('/invite')

  // 1. UNAUTHENTICATED USERS: Enforce login walls
  if (!user) {
    if (isDashboard || isCfoPortal || isApprove) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // 2. AUTHENTICATED USERS: Enforce strict role-based routing at the Edge
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  const role = userData?.role;

  // Protect Clerk routes
  if (isDashboard && role !== 'clerk') {
    return NextResponse.redirect(new URL('/cfo-portal', request.url));
  }

  // Protect Executive routes
  if (isCfoPortal && role === 'clerk') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Handle post-login routing fallback
  if (isAuthRoute) {
    return NextResponse.redirect(new URL(role === 'clerk' ? '/dashboard' : '/cfo-portal', request.url));
  }

  return response
}

export const config = { matcher: ['/dashboard/:path*', '/cfo-portal/:path*', '/approve/:path*', '/login', '/invite/:path*'] }
