import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase server client for use in API routes and server components.
 * Returns null if Supabase is not configured.
 */
export async function getSupabaseServerClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // setAll can fail in Server Components where cookies are read-only.
                    // This is expected and can be safely ignored when called from
                    // a Server Component rather than a Route Handler or Server Action.
                }
            },
        },
    });
}
