import { createClient } from '@/lib/supabase/server';

export type GodModeIdentity = {
  id: string;
  email: string;
};

/** Resolve the server-only Super Admin email allowlist and authenticated user. */
export async function getGodModeUser(): Promise<GodModeIdentity | null> {
  const allowlistedEmails = (process.env.CLEARWIRE_SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowlistedEmails.length === 0) return null;

  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase();
    if (error || !user?.id || !email || !allowlistedEmails.includes(email)) return null;

    return { id: user.id, email };
  } catch {
    // Fail closed: auth/configuration errors must never expose the admin route.
    return null;
  }
}

export async function hasGodModeAccess(): Promise<boolean> {
  return (await getGodModeUser()) !== null;
}
