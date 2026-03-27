"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";

export interface JournalEntry {
    id: string;
    date: string;
    emotion: string;
    intensity: "low" | "medium" | "high";
    message: string;
    mealName?: string;
    mealId?: string;
    userInputText?: string;
    reflectionEmotion?: string;
    reflectionIntensity?: "low" | "medium" | "high";
    reflectionNote?: string;
    reflectedAt?: string;
}

interface JournalContextType {
    entries: JournalEntry[];
    addEntry: (entry: Omit<JournalEntry, "id" | "date">) => void;
    updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
    getEntry: (id: string) => JournalEntry | undefined;
    clearEntries: () => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider = ({ children }: { children: ReactNode }) => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("moodmeals_journal");
            if (stored) setEntries(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("moodmeals_journal", JSON.stringify(entries));
        } catch { /* ignore */ }
    }, [entries]);

    const addEntry = useCallback((entry: Omit<JournalEntry, "id" | "date">) => {
        setEntries(prev => [
            {
                ...entry,
                id: `entry-${Date.now()}`,
                date: new Date().toISOString(),
            },
            ...prev,
        ]);
    }, []);

    const updateEntry = useCallback((id: string, updates: Partial<JournalEntry>) => {
        setEntries(prev =>
            prev.map(entry => entry.id === id ? { ...entry, ...updates } : entry)
        );
    }, []);

    const getEntry = useCallback(
        (id: string) => entries.find((e) => e.id === id),
        [entries]
    );

    const clearEntries = useCallback(() => setEntries([]), []);

    const contextValue = useMemo(() => ({
        entries, addEntry, updateEntry, getEntry, clearEntries,
    }), [entries, addEntry, updateEntry, getEntry, clearEntries]);

    return (
        <JournalContext.Provider value={contextValue}>
            {children}
        </JournalContext.Provider>
    );
};

export const useJournal = () => {
    const ctx = useContext(JournalContext);
    if (!ctx) throw new Error("useJournal must be used inside JournalProvider");
    return ctx;
};

/** Safe version — returns undefined when used outside JournalProvider */
export const useJournalOptional = () => useContext(JournalContext);
