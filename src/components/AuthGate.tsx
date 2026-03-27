"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, readSavedPrefs } from "@/context/UserContext";

/**
 * AuthGate renders a sign-in screen when the user is not authenticated.
 * Once authenticated (via Google or guest), it renders children.
 */
const AuthGate = ({ children }: { children: React.ReactNode }) => {
    const { profile, loading, supabaseEnabled, signInWithGoogle, signInAsGuest } =
        useUser();

    const savedPrefs = typeof window !== "undefined" ? readSavedPrefs() : null;
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestAllergies, setGuestAllergies] = useState(savedPrefs?.allergies?.join(", ") ?? "");
    const [guestPreference, setGuestPreference] = useState<"veg" | "non-veg" | "vegan">(savedPrefs?.preference ?? "veg");

    // Safety: if loading hangs for more than 3 seconds, force past it
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => setLoadingTimedOut(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    // Check localStorage directly as a fast bypass — if we have a profile there,
    // show the app immediately without waiting for Supabase
    const hasLocalProfile = typeof window !== "undefined" && !!localStorage.getItem("moodmeals_user_profile");

    // Show children if: profile is set OR we have a local profile (fast path)
    if (profile || hasLocalProfile) {
        return <>{children}</>;
    }

    // Only show loading briefly, with a timeout escape
    if (loading && !loadingTimedOut) {
        return (
            <div style={overlayStyle}>
                <div style={cardStyle}>
                    <p style={{ color: "var(--text-mid)", fontSize: "1rem" }}>Loading...</p>
                </div>
            </div>
        );
    }

    const handleGuestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName.trim()) return;
        const allergiesList = guestAllergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);
        signInAsGuest(guestName.trim(), guestEmail.trim(), allergiesList, guestPreference);
    };

    return (
        <div style={overlayStyle}>
            <div style={cardStyle}>
                <h2 style={titleStyle}>Welcome to MoodMeals</h2>
                <p style={subtitleStyle}>
                    Sign in to sync your mood, meals, and data across devices.
                </p>

                {/* Google Sign-In (primary) */}
                {supabaseEnabled && (
                    <button onClick={signInWithGoogle} style={googleBtnStyle}>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 48 48"
                            style={{ marginRight: 10, flexShrink: 0 }}
                        >
                            <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            />
                            <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                            />
                            <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            />
                        </svg>
                        Continue with Google
                    </button>
                )}

                {/* Divider */}
                <div style={dividerStyle}>
                    <span style={dividerLineStyle} />
                    <span style={dividerTextStyle}>
                        {supabaseEnabled ? "or" : "sign in"}
                    </span>
                    <span style={dividerLineStyle} />
                </div>

                {/* Guest form toggle */}
                {!showGuestForm ? (
                    <button
                        onClick={() => setShowGuestForm(true)}
                        style={guestToggleStyle}
                    >
                        Continue as Guest
                    </button>
                ) : (
                    <form onSubmit={handleGuestSubmit} style={formStyle}>
                        <input
                            type="text"
                            placeholder="Your name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            style={inputStyle}
                            required
                            autoFocus
                        />
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Allergies (comma-separated, optional)"
                            value={guestAllergies}
                            onChange={(e) => setGuestAllergies(e.target.value)}
                            style={inputStyle}
                        />
                        <div style={prefGroupStyle}>
                            <span style={prefGroupLabelStyle}>I eat:</span>
                            <div style={prefChipsRowStyle}>
                                {(["veg", "non-veg", "vegan"] as const).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        style={{
                                            ...prefChipStyle,
                                            ...(guestPreference === p ? prefChipActiveStyle : {}),
                                        }}
                                        onClick={() => setGuestPreference(p)}
                                    >
                                        {p === "veg" ? "Veg" : p === "non-veg" ? "Non-Veg" : "Vegan"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" style={submitBtnStyle}>
                            Get Started
                        </button>
                    </form>
                )}

                <Link href="/" style={backLinkStyle} className="hide-mobile">
                    ← Back to landing page
                </Link>
            </div>
        </div>
    );
};

export default AuthGate;

/* ---------- Inline styles (keeps the component self-contained) ---------- */

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--cream)",
    zIndex: 9999,
    padding: "24px",
};

const cardStyle: React.CSSProperties = {
    background: "var(--warm-white)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-lg)",
    padding: "48px 40px",
    maxWidth: 420,
    width: "100%",
    textAlign: "center",
};

const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-lora), serif",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--text-dark)",
    marginBottom: 8,
};

const subtitleStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: "var(--text-mid)",
    marginBottom: 32,
    lineHeight: 1.5,
};

const googleBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid #dadce0",
    backgroundColor: "#fff",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#3c4043",
    cursor: "pointer",
    transition: "var(--transition)",
};

const dividerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "24px 0",
};

const dividerLineStyle: React.CSSProperties = {
    flex: 1,
    height: 1,
    backgroundColor: "var(--beige-dark)",
};

const dividerTextStyle: React.CSSProperties = {
    fontSize: "0.8rem",
    color: "var(--text-light)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};

const guestToggleStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--beige-dark)",
    backgroundColor: "transparent",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-mid)",
    cursor: "pointer",
    transition: "var(--transition)",
};

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--beige-dark)",
    fontSize: "0.9rem",
    color: "var(--text-dark)",
    backgroundColor: "var(--surface)",
    outline: "none",
};

const backLinkStyle: React.CSSProperties = {
    display: "inline-block",
    marginTop: 24,
    fontSize: "0.85rem",
    color: "var(--sage)",
    fontWeight: 600,
    textDecoration: "none",
};

const submitBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    backgroundColor: "var(--sage)",
    color: "var(--on-primary)",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "var(--transition)",
    marginTop: 4,
};

const prefGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
};

const prefGroupLabelStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-mid)",
};

const prefChipsRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    width: "100%",
};

const prefChipStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--beige-dark)",
    backgroundColor: "transparent",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-mid)",
    cursor: "pointer",
    transition: "var(--transition)",
};

const prefChipActiveStyle: React.CSSProperties = {
    backgroundColor: "var(--sage)",
    color: "var(--on-primary)",
    borderColor: "var(--sage)",
};
