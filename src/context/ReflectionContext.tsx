"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";

export interface PendingReflection {
    mealId: string;
    mealName: string;
    journalEntryId: string;
    addedAt: string; // ISO timestamp
}

interface ReflectionContextType {
    pendingReflections: PendingReflection[];
    addPendingReflection: (reflection: PendingReflection) => void;
    removePendingReflection: (mealId: string) => void;
    getReadyReflection: () => PendingReflection | null;
}

const STORAGE_KEY = "moodmeals_pending_reflections";
const REFLECTION_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

const ReflectionContext = createContext<ReflectionContextType | undefined>(undefined);

export const ReflectionProvider = ({ children }: { children: ReactNode }) => {
    const [pendingReflections, setPendingReflections] = useState<PendingReflection[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setPendingReflections(JSON.parse(stored));
            }
        } catch {
            // Ignore parse errors
        }
        setLoaded(true);
    }, []);

    // Persist to localStorage on change (only after initial load)
    useEffect(() => {
        if (!loaded) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingReflections));
        } catch {
            // Ignore storage errors
        }
    }, [pendingReflections, loaded]);

    const addPendingReflection = useCallback((reflection: PendingReflection) => {
        setPendingReflections((prev) => {
            // Avoid duplicates for the same meal
            if (prev.some((r) => r.mealId === reflection.mealId)) return prev;
            return [...prev, reflection];
        });
    }, []);

    const removePendingReflection = useCallback((mealId: string) => {
        setPendingReflections((prev) => prev.filter((r) => r.mealId !== mealId));
    }, []);

    const getReadyReflection = useCallback((): PendingReflection | null => {
        const now = Date.now();
        const ready = pendingReflections.find((r) => {
            const elapsed = now - new Date(r.addedAt).getTime();
            return elapsed >= REFLECTION_DELAY_MS;
        });
        return ready ?? null;
    }, [pendingReflections]);

    const contextValue = useMemo(() => ({
        pendingReflections,
        addPendingReflection,
        removePendingReflection,
        getReadyReflection,
    }), [pendingReflections, addPendingReflection, removePendingReflection, getReadyReflection]);

    return (
        <ReflectionContext.Provider value={contextValue}>
            {children}
        </ReflectionContext.Provider>
    );
};

export const useReflection = () => {
    const ctx = useContext(ReflectionContext);
    if (!ctx) throw new Error("useReflection must be used inside ReflectionProvider");
    return ctx;
};
