"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStressCalendar } from "../context/StressCalendarContext";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEventType } from "../types";
import styles from "./GoogleCalendarConnect.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionState = "disconnected" | "connecting" | "connected" | "error" | "no-google";

interface GoogleCalendarEvent {
    title: string;
    date: string;
    time?: string;
    type: CalendarEventType;
}

// Google color SVG icon
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GoogleCalendarConnect = () => {
    const { addEvent, events } = useStressCalendar();
    const [state, setState] = useState<ConnectionState>("disconnected");
    const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    // ------------------------------------------------------------------
    // Check for Supabase Google provider token on mount
    // ------------------------------------------------------------------

    useEffect(() => {
        let mounted = true;

        async function checkSession() {
            const supabase = createClient();
            if (!supabase) {
                if (mounted) setState("no-google");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!mounted) return;

            if (session?.provider_token) {
                setState("connected");
            } else if (session?.user) {
                // Logged in via Supabase but no Google provider token available
                // (token may have expired from the session — user needs to re-auth)
                setState("no-google");
            } else {
                setState("no-google");
            }
        }

        checkSession();
        return () => { mounted = false; };
    }, []);

    // ------------------------------------------------------------------
    // Fetch events from our API route and add them to context
    // ------------------------------------------------------------------

    const fetchAndSyncEvents = useCallback(
        async (token: string) => {
            try {
                setState("connecting");
                const res = await fetch("/api/calendar/google", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401) {
                    setState("error");
                    setErrorMsg("Session expired. Please sign in with Google again.");
                    return;
                }

                if (!res.ok) {
                    throw new Error(`API returned ${res.status}`);
                }

                const data: { events: GoogleCalendarEvent[] } = await res.json();
                const fetched = data.events ?? [];

                // Deduplicate: skip events whose title + date already exist locally
                const existingKeys = new Set(
                    events.map((e) => `${e.title}::${e.date}`),
                );

                let added = 0;
                for (const evt of fetched) {
                    const key = `${evt.title}::${evt.date}`;
                    if (existingKeys.has(key)) continue;
                    addEvent({
                        title: evt.title,
                        date: evt.date,
                        time: evt.time,
                        type: evt.type,
                    });
                    existingKeys.add(key); // prevent duplicates within the same batch
                    added++;
                }

                setLastSyncCount(added);
                setState("connected");
            } catch (err) {
                console.warn("[GoogleCalendarConnect] Sync failed:", err);
                setState("error");
                setErrorMsg("Failed to sync events. Please try again.");
            }
        },
        [addEvent, events],
    );

    // ------------------------------------------------------------------
    // User actions
    // ------------------------------------------------------------------

    const handleSync = async () => {
        const supabase = createClient();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.provider_token;

        if (!token) {
            setState("error");
            setErrorMsg("Google token not available. Please sign in with Google again.");
            return;
        }

        setLastSyncCount(null);
        fetchAndSyncEvents(token);
    };

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    if (state === "no-google") {
        return (
            <div className={styles.wrapper}>
                <div className={styles.connectBtn} style={{ opacity: 0.6, cursor: "default" }}>
                    <GoogleIcon className={styles.googleIcon} />
                    <span>Sign in with Google to sync your calendar</span>
                </div>
            </div>
        );
    }

    if (state === "connected") {
        return (
            <div className={styles.wrapper}>
                <div className={styles.connectedBar}>
                    <div className={styles.connectedBadge}>
                        <span className={styles.checkMark} aria-hidden="true">
                            &#10003;
                        </span>
                        <span>Google Calendar</span>
                    </div>
                    <button
                        className={styles.syncBtn}
                        onClick={handleSync}
                        type="button"
                    >
                        Sync Calendar
                    </button>
                </div>
                {lastSyncCount !== null && (
                    <div className={styles.syncStatus}>
                        {lastSyncCount === 0
                            ? "All events already synced."
                            : `Synced ${lastSyncCount} new event${lastSyncCount === 1 ? "" : "s"}.`}
                    </div>
                )}
            </div>
        );
    }

    if (state === "connecting") {
        return (
            <div className={styles.wrapper}>
                <div className={styles.connectBtn} style={{ opacity: 0.6, cursor: "wait" }}>
                    <GoogleIcon className={styles.googleIcon} />
                    <span>Syncing...</span>
                </div>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className={styles.wrapper}>
                <div className={styles.errorBar}>
                    <span className={styles.errorText}>{errorMsg}</span>
                    <button
                        className={styles.retryBtn}
                        onClick={handleSync}
                        type="button"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default GoogleCalendarConnect;
