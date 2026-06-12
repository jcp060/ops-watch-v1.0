import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, isSupabasePublicConfigured } from "./env.public";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const { url, anonKey } = getSupabasePublicConfig();

  if (!isSupabasePublicConfigured()) return null;

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return browserClient;
}
