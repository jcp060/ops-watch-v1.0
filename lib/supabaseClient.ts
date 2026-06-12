/**
 * Browser Supabase client (anon key only).
 *
 * Use in Client Components when direct Supabase access is needed.
 * Most data flows through `/api/*` routes instead.
 *
 * For server/API code use `@/lib/supabase/server` (never import that in client code).
 */
export { createSupabaseBrowser } from "./supabase/client";
