import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/app";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!code || !supabaseUrl || !supabaseAnonKey) {
        return NextResponse.redirect(`${origin}/`);
    }

    const cookieStore = await cookies();

    // Capture cookies that Supabase sets during code exchange.
    // We CANNOT rely on cookieStore.set() because NextResponse.redirect()
    // creates a NEW response that discards those headers.
    const cookiesToForward: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookies) {
                // Capture — don't set on cookieStore
                cookies.forEach((cookie) => cookiesToForward.push(cookie));
            },
        },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("[auth/callback] Code exchange failed:", error.message);
        return NextResponse.redirect(`${origin}/?error=auth`);
    }

    // Create redirect response and explicitly set ALL auth cookies on it
    const response = NextResponse.redirect(`${origin}${next}`);
    for (const { name, value, options } of cookiesToForward) {
        response.cookies.set(name, value, options as Record<string, string>);
    }

    return response;
}
