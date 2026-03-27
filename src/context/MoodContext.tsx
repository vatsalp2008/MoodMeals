"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MealPreference, MoodAnalysis } from "../types";

export type { MoodAnalysis };
export type { ClinicalMoodState } from "../types";

export type SustainMode = "sustain" | "winddown" | null;

interface MoodContextType {
    analysis: MoodAnalysis | null;
    setAnalysis: (a: MoodAnalysis | null) => void;
    preference: MealPreference;
    setPreference: (p: MealPreference) => void;
    sustainMode: SustainMode;
    setSustainMode: (m: SustainMode) => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export const MoodProvider = ({ children }: { children: ReactNode }) => {
    const [analysis, setAnalysis] = useState<MoodAnalysis | null>(() => {
        try {
            if (typeof window === "undefined") return null;
            const stored = localStorage.getItem("moodmeals_analysis");
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });
    const [preference, setPreference] = useState<MealPreference>(() => {
        try {
            if (typeof window === "undefined") return "veg";
            const stored = localStorage.getItem("moodmeals_preference");
            return stored ? (JSON.parse(stored) as MealPreference) : "veg";
        } catch { return "veg"; }
    });
    const [sustainMode, setSustainMode] = useState<SustainMode>(() => {
        try {
            if (typeof window === "undefined") return null;
            const stored = localStorage.getItem("moodmeals_sustainMode");
            return stored ? (JSON.parse(stored) as SustainMode) : null;
        } catch { return null; }
    });

    useEffect(() => {
        try { localStorage.setItem("moodmeals_analysis", JSON.stringify(analysis)); } catch { /* ignore */ }
    }, [analysis]);

    useEffect(() => {
        try { localStorage.setItem("moodmeals_preference", JSON.stringify(preference)); } catch { /* ignore */ }
    }, [preference]);

    useEffect(() => {
        try { localStorage.setItem("moodmeals_sustainMode", JSON.stringify(sustainMode)); } catch { /* ignore */ }
    }, [sustainMode]);

    return (
        <MoodContext.Provider value={{ analysis, setAnalysis, preference, setPreference, sustainMode, setSustainMode }}>
            {children}
        </MoodContext.Provider>
    );
};

export const useMood = () => {
    const ctx = useContext(MoodContext);
    if (!ctx) throw new Error("useMood must be used inside MoodProvider");
    return ctx;
};
