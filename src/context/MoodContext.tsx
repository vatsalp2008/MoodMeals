"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { MealPreference } from "../types";

export interface MoodAnalysis {
    emotion: string;
    intensity: "low" | "medium" | "high";
    recommendedMoods: string[];
    message: string;
}

interface MoodContextType {
    analysis: MoodAnalysis | null;
    setAnalysis: (a: MoodAnalysis | null) => void;
    preference: MealPreference;
    setPreference: (p: MealPreference) => void;
    pantryItems: string[];
    setPantryItems: (items: string[]) => void;
    budget: number;
    setBudget: (budget: number) => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export const MoodProvider = ({ children }: { children: ReactNode }) => {
    const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
    const [preference, setPreference] = useState<MealPreference>("veg");
    const [pantryItems, setPantryItems] = useState<string[]>([]);
    const [budget, setBudget] = useState<number>(40);

    return (
        <MoodContext.Provider
            value={{
                analysis,
                setAnalysis,
                preference,
                setPreference,
                pantryItems,
                setPantryItems,
                budget,
                setBudget,
            }}
        >
            {children}
        </MoodContext.Provider>
    );
};

export const useMood = () => {
    const ctx = useContext(MoodContext);
    if (!ctx) throw new Error("useMood must be used inside MoodProvider");
    return ctx;
};
