"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Catches OAuth auth codes that land on the wrong page (e.g., "/" instead of "/auth/callback").
 * Redirects them to the proper callback route for code exchange.
 */
export default function AuthCodeRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code");
        if (code) {
            // Redirect to the callback route which handles the code exchange
            router.replace(`/auth/callback?code=${code}&next=/app`);
        }
    }, [searchParams, router]);

    return null;
}
