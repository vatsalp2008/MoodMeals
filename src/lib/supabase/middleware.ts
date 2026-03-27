import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request.
 * This is REQUIRED because:
 * 1. Server Components can't write cookies
 * 2. Auth tokens expire and need to be refreshed via middleware
 * 3. The refreshed tokens must be forwarded to both the server and browser
 */
export async function updateSession(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If Supabase is not configured, pass through
    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                // First, set cookies on the request (for downstream server components)
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                // Then create a new response that includes the updated request
                supabaseResponse = NextResponse.next({ request });
                // Finally, set cookies on the response (for the browser)
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // IMPORTANT: Do NOT use getSession() here — it reads from storage
    // and can be spoofed. getUser() validates against the Supabase server.
    await supabase.auth.getUser();

    return supabaseResponse;
}
