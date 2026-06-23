import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let adminClientKey: string | null = null;

export function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side admin operations."
    );
  }

  if (serviceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY cannot be the same as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  if (!adminClient || adminClientKey !== serviceRoleKey) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    adminClientKey = serviceRoleKey;
  }

  return adminClient;
}
