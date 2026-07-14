import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. SERVER-ONLY: bypasses RLS, so it must never be
 * imported into client components or exposed to the browser. Use it in API
 * routes that legitimately need to write privileged tables (e.g. the public
 * membership form inserting into `members`, which the anon role cannot do
 * because `members` is RLS-locked with no anon policy).
 *
 * Keyed on SUPABASE_SERVICE_ROLE_KEY (not NEXT_PUBLIC_*, so it is never bundled
 * into client JS). No cookie/session wiring: this client is not a user session,
 * it is a trusted server actor.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase service client misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
