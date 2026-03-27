import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns a Supabase browser client if env vars are configured, otherwise null.
 * This enables graceful degradation to localStorage-only mode.
 */
export function getSupabaseBrowserClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Boolean flag to check if Supabase is configured.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
