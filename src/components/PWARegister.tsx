"use client";

import { useEffect } from "react";

const PWARegister = () => {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        // Register once on the client.
        navigator.serviceWorker
            .register("/sw.js")
            .catch(() => {
                // Ignore registration errors in dev.
            });
    }, []);

    return null;
};

export default PWARegister;

