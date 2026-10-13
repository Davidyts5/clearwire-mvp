import { createClient } from '@/lib/supabase/server';

/**
 * Resolve the Super Admin allowlist on the server for every God Mode request.
 * The environment variable is a comma-separated list of email addresses.
 */
export async function hasGodModeAccess(): Promise<boolean> {
  const allowlistedEmails = (process.env.CLEARWIRE_SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowlistedEmails.length === 0) return false;

  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return false;

    return allowlistedEmails.includes(user.email.trim().toLowerCase());
  } catch {
    // Fail closed: auth/configuration errors must never expose the admin route.
    return false;
  }
}
