"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStressCalendar } from "../context/StressCalendarContext";
import type { CalendarEventType } from "../types";
import styles from "./GoogleCalendarConnect.module.css";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const TOKEN_KEY = "moodmeals_google_token";
const TOKEN_EXPIRY_KEY = "moodmeals_google_token_expiry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

interface GoogleCalendarEvent {
    title: string;
    date: string;
    time?: string;
    type: CalendarEventType;
}

interface TokenResponse {
    access_token: string;
    expires_in: number;
}

interface TokenClient {
    requestAccessToken: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;
    if (Date.now() > Number(expiry)) {
        // Token expired — clean up
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        return null;
    }
    return token;
}

function storeToken(token: string, expiresIn: number): void {
    localStorage.setItem(TOKEN_KEY, token);
    // Store expiry with a 5-minute buffer
    localStorage.setItem(
        TOKEN_EXPIRY_KEY,
        String(Date.now() + (expiresIn - 300) * 1000),
    );
}

function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
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
    const tokenClientRef = useRef<TokenClient | null>(null);
    const gsiLoadedRef = useRef(false);

    // If no client ID is configured, render nothing
    if (!GOOGLE_CLIENT_ID) return null;

    // ------------------------------------------------------------------
    // Load Google Identity Services script
    // ------------------------------------------------------------------

    /* eslint-disable react-hooks/rules-of-hooks */

    useEffect(() => {
        // Check for existing valid token on mount
        const existingToken = getStoredToken();
        if (existingToken) {
            setState("connected");
        }

        // Load GIS script if not already present
        if (gsiLoadedRef.current) return;
        if (document.querySelector('script[src*="accounts.google.com/gsi/client"]'))  {
            gsiLoadedRef.current = true;
            initTokenClient();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            gsiLoadedRef.current = true;
            initTokenClient();
        };
        script.onerror = () => {
            console.warn("[GoogleCalendarConnect] Failed to load GIS script");
        };
        document.head.appendChild(script);

        // No cleanup — the script stays loaded for the session
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ------------------------------------------------------------------
    // Initialize the Google OAuth token client
    // ------------------------------------------------------------------

    const initTokenClient = useCallback(() => {
        // google.accounts.oauth2 is provided by the GIS script
        const google = (window as unknown as Record<string, unknown>).google as
            | {
                  accounts: {
                      oauth2: {
                          initTokenClient: (config: {
                              client_id: string;
                              scope: string;
                              callback: (resp: TokenResponse & { error?: string }) => void;
                          }) => TokenClient;
                      };
                  };
              }
            | undefined;

        if (!google?.accounts?.oauth2) return;

        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    setState("error");
                    setErrorMsg("Google sign-in was cancelled or failed.");
                    return;
                }
                storeToken(tokenResponse.access_token, tokenResponse.expires_in);
                setState("connected");
                // Auto-sync after connecting
                fetchAndSyncEvents(tokenResponse.access_token);
            },
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ------------------------------------------------------------------
    // Fetch events from our API route and add them to context
    // ------------------------------------------------------------------

    const fetchAndSyncEvents = useCallback(
        async (token: string) => {
            try {
                const res = await fetch("/api/calendar/google", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401) {
                    // Token expired or revoked
                    clearToken();
                    setState("disconnected");
                    setErrorMsg("Session expired. Please reconnect.");
                    setState("error");
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
            } catch (err) {
                console.warn("[GoogleCalendarConnect] Sync failed:", err);
                setState("error");
                setErrorMsg("Failed to sync events. Please try again.");
            }
        },
        [addEvent, events],
    );

    /* eslint-enable react-hooks/rules-of-hooks */

    // ------------------------------------------------------------------
    // User actions
    // ------------------------------------------------------------------

    const handleConnect = () => {
        setState("connecting");
        setErrorMsg("");
        if (tokenClientRef.current) {
            tokenClientRef.current.requestAccessToken();
        } else {
            // GIS might not have loaded yet — try to init
            initTokenClient();
            // Small delay then retry
            setTimeout(() => {
                if (tokenClientRef.current) {
                    tokenClientRef.current.requestAccessToken();
                } else {
                    setState("error");
                    setErrorMsg(
                        "Google sign-in is not available. Please try again.",
                    );
                }
            }, 500);
        }
    };

    const handleSync = () => {
        const token = getStoredToken();
        if (!token) {
            // Token expired
            setState("disconnected");
            return;
        }
        setLastSyncCount(null);
        fetchAndSyncEvents(token);
    };

    const handleDisconnect = () => {
        clearToken();
        setState("disconnected");
        setLastSyncCount(null);
        setErrorMsg("");
    };

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

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
                        Sync
                    </button>
                    <button
                        className={styles.disconnectBtn}
                        onClick={handleDisconnect}
                        type="button"
                    >
                        Disconnect
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

    if (state === "error") {
        return (
            <div className={styles.wrapper}>
                <div className={styles.errorBar}>
                    <span className={styles.errorText}>{errorMsg}</span>
                    <button
                        className={styles.retryBtn}
                        onClick={handleConnect}
                        type="button"
                    >
                        Reconnect
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <button
                className={styles.connectBtn}
                onClick={handleConnect}
                disabled={state === "connecting"}
                type="button"
            >
                <GoogleIcon className={styles.googleIcon} />
                <span>
                    {state === "connecting"
                        ? "Connecting..."
                        : "Connect Google Calendar"}
                </span>
            </button>
        </div>
    );
};

export default GoogleCalendarConnect;
