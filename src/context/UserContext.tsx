"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

/* ---------- Types ---------- */

export interface UserProfile {
    name: string;
    email: string;
    allergies: string[];
    preference: "veg" | "non-veg" | "vegan";
}

interface UserContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    supabaseEnabled: boolean;
    signInWithGoogle: () => Promise<void>;
    signInAsGuest: (name: string, email: string, allergies?: string[], preference?: "veg" | "non-veg" | "vegan") => void;
    signOut: () => Promise<void>;
    updateProfile: (partial: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/* ---------- localStorage helpers ---------- */

const LOCAL_PROFILE_KEY = "moodmeals_user_profile";
const LOCAL_PREFS_KEY = "moodmeals_saved_prefs";

function readLocalProfile(): UserProfile | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
        return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch { return null; }
}

function writeLocalProfile(profile: UserProfile) {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    // Also persist preferences separately so they survive sign-out
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify({
        allergies: profile.allergies,
        preference: profile.preference,
    }));
}

function clearLocalProfile() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    // NOTE: LOCAL_PREFS_KEY is intentionally NOT cleared so preferences persist
}

/** Read saved preferences that survive sign-out. */
export function readSavedPrefs(): { allergies: string[]; preference: "veg" | "non-veg" | "vegan" } | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(LOCAL_PREFS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function profileFromUser(authUser: User): UserProfile {
    return {
        name: authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? "",
        email: authUser.email ?? "",
        allergies: [],
        preference: "veg",
    };
}

/* ---------- Provider ---------- */

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [supabase] = useState<SupabaseClient | null>(() =>
        isSupabaseConfigured ? createClient() : null
    );
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    /* ---- Bootstrap: check session on mount ---- */
    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                if (supabase) {
                    // getUser() validates session against Supabase server.
                    // Add a timeout so we don't hang forever if Supabase is slow.
                    const getUserPromise = supabase.auth.getUser();
                    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
                        setTimeout(() => resolve({ data: { user: null } }), 5000)
                    );
                    const { data: { user: authUser } } = await Promise.race([getUserPromise, timeoutPromise]);

                    if (authUser && mounted) {
                        setUser(authUser);
                        const p = profileFromUser(authUser);
                        // Set profile immediately — don't block on DB query
                        setProfile(p);
                        writeLocalProfile(p);

                        // Enrich from DB in background (non-blocking)
                        supabase
                            .from("user_profiles")
                            .select("name, allergies, preference")
                            .eq("id", authUser.id)
                            .single()
                            .then(({ data }) => {
                                if (data && mounted) {
                                    const dbProfile: UserProfile = {
                                        name: data.name ?? p.name,
                                        email: p.email,
                                        allergies: data.allergies ?? [],
                                        preference: data.preference ?? "veg",
                                    };
                                    setProfile(dbProfile);
                                    writeLocalProfile(dbProfile);
                                }
                            });
                    } else if (mounted) {
                        // No Supabase session — try localStorage
                        const local = readLocalProfile();
                        if (local) setProfile(local);
                    }
                } else {
                    // No Supabase configured — localStorage only
                    const local = readLocalProfile();
                    if (local && mounted) setProfile(local);
                }
            } catch (err) {
                console.warn("[UserContext] Init error:", err);
                const local = readLocalProfile();
                if (local && mounted) setProfile(local);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        init();

        // Listen for auth changes (handles sign-in after OAuth redirect)
        let subscription: { unsubscribe: () => void } | undefined;

        if (supabase) {
            const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
                async (_event, session) => {
                    if (!mounted) return;

                    if (session?.user) {
                        setUser(session.user);
                        const p = profileFromUser(session.user);
                        // Set profile immediately so loading stops — don't wait for DB
                        setProfile(p);
                        writeLocalProfile(p);
                        setLoading(false);

                        // Then try DB in background (non-blocking)
                        supabase
                            .from("user_profiles")
                            .select("name, allergies, preference")
                            .eq("id", session.user.id)
                            .single()
                            .then(({ data }) => {
                                if (data && mounted) {
                                    const dbProfile: UserProfile = {
                                        name: data.name ?? p.name,
                                        email: p.email,
                                        allergies: data.allergies ?? [],
                                        preference: data.preference ?? "veg",
                                    };
                                    setProfile(dbProfile);
                                    writeLocalProfile(dbProfile);
                                }
                            });
                    } else {
                        setUser(null);
                        setProfile(null);
                    }
                }
            );
            subscription = sub;
        }

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, [supabase]);

    /* ---- Actions ---- */

    const signInWithGoogle = useCallback(async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/app`,
                scopes: "https://www.googleapis.com/auth/calendar.readonly",
            },
        });
        if (error) console.error("Google sign-in error:", error.message);
    }, [supabase]);

    const signInAsGuest = useCallback(
        (name: string, email: string, allergies: string[] = [], preference: "veg" | "non-veg" | "vegan" = "veg") => {
            const guestProfile: UserProfile = { name, email, allergies, preference };
            writeLocalProfile(guestProfile);
            setProfile(guestProfile);
            setLoading(false);
        },
        []
    );

    const signOut = useCallback(async () => {
        if (supabase) {
            await supabase.auth.signOut({ scope: "local" });
        }
        clearLocalProfile();
        setUser(null);
        setProfile(null);
        setLoading(false);
    }, [supabase]);

    const updateProfile = useCallback(
        async (partial: Partial<UserProfile>) => {
            setProfile((prev) => {
                if (!prev) return prev;
                const updated = { ...prev, ...partial };
                if (supabase && user) {
                    supabase.from("user_profiles").upsert({
                        id: user.id,
                        name: updated.name,
                        allergies: updated.allergies,
                        preference: updated.preference,
                    });
                }
                writeLocalProfile(updated);
                return updated;
            });
        },
        [supabase, user]
    );

    const contextValue = useMemo(() => ({
        user, profile, loading,
        supabaseEnabled: isSupabaseConfigured,
        signInWithGoogle, signInAsGuest, signOut, updateProfile,
    }), [user, profile, loading, signInWithGoogle, signInAsGuest, signOut, updateProfile]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

/* ---------- Hooks ---------- */

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used inside UserProvider");

    return {
        ...ctx,
        /** The raw Supabase Auth user (null for guests). */
        authUser: ctx.user,
        user: ctx.profile ? {
            name: ctx.profile.name,
            email: ctx.profile.email,
            allergies: (ctx.profile.allergies ?? []) as import("@/types").AllergyType[],
            avatarColor: "#7a9e87",
        } : null,
        isLoggedIn: !!ctx.profile,
        login: (name: string, email: string, allergies?: import("@/types").AllergyType[]) => {
            ctx.signInAsGuest(name, email, allergies as string[]);
        },
        logout: () => { ctx.signOut(); },
        updateAllergies: (allergies: import("@/types").AllergyType[]) => {
            ctx.updateProfile({ allergies: allergies as string[] });
        },
    };
};

export const useUserOptional = () => {
    const ctx = useContext(UserContext);
    if (!ctx) return undefined;
    return {
        ...ctx,
        user: ctx.profile ? {
            name: ctx.profile.name,
            email: ctx.profile.email,
            allergies: (ctx.profile.allergies ?? []) as import("@/types").AllergyType[],
            avatarColor: "#7a9e87",
        } : null,
        isLoggedIn: !!ctx.profile,
    };
};
