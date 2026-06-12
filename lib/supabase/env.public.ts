/** Public Supabase env vars — safe for browser and server. */

export function getSupabasePublicConfig(): {
  url: string;
  anonKey: string;
} {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  };
}

export function isSupabasePublicConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicConfig();
  return Boolean(
    url &&
      anonKey &&
      !url.includes("your-project") &&
      !url.includes("xxxxxxxx")
  );
}
