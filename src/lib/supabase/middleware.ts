import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request.
 *
 * IMPORTANT: Only set cookies on the RESPONSE, not on the request.
 * Setting on both causes a known Next.js bug where Set-Cookie headers
 * conflict and auth cookies fail to propagate.
 * See: https://github.com/supabase/ssr/issues/36
 */
export async function updateSession(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next({ request });
    }

    // Create a single response object — cookies are set ONLY on this
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                // ONLY set on the response — NOT on request.cookies
                // This avoids the Next.js dual Set-Cookie header bug
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    // getUser() triggers token refresh if needed, writing new cookies via setAll
    await supabase.auth.getUser();

    return response;
}
