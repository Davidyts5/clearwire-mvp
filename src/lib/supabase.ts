import { createBrowserClient } from '@supabase/ssr'

let supabase: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (supabase) return supabase

  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Enforce the 1-hour timebomb on the client side as well
        maxAge: 3600
      }
    }
  )

  return supabase
}
