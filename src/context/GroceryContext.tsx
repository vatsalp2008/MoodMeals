"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Meal } from "../types";

interface GroceryContextType {
    selectedMeals: Meal[];
    addMeal: (meal: Meal) => void;
    removeMeal: (id: string) => void;
    hasMeal: (id: string) => boolean;
    clearMeals: () => void;
    mealServings: Record<string, number>;
    setServings: (mealId: string, count: number) => void;
    mealPrepDays: number;
    setMealPrepDays: (days: number) => void;
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

interface StoredState {
    selectedMeals: Meal[];
    mealServings: Record<string, number>;
    mealPrepDays: number;
}

export const GroceryProvider = ({ children }: { children: ReactNode }) => {
    const [selectedMeals, setSelectedMeals] = useState<Meal[]>([]);
    const [mealServings, setMealServings] = useState<Record<string, number>>({});
    const [mealPrepDays, setMealPrepDaysState] = useState<number>(1);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("moodmeals_grocery");
            if (stored) {
                const parsed = JSON.parse(stored);
                // Handle old format (plain array) and new format (object)
                if (Array.isArray(parsed)) {
                    setSelectedMeals(parsed);
                } else {
                    const state = parsed as StoredState;
                    setSelectedMeals(state.selectedMeals ?? []);
                    setMealServings(state.mealServings ?? {});
                    setMealPrepDaysState(state.mealPrepDays ?? 1);
                }
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        try {
            const state: StoredState = { selectedMeals, mealServings, mealPrepDays };
            localStorage.setItem("moodmeals_grocery", JSON.stringify(state));
        } catch { /* ignore */ }
    }, [selectedMeals, mealServings, mealPrepDays]);

    const addMeal = useCallback((meal: Meal) => {
        setSelectedMeals(prev => {
            if (prev.some(m => m.id === meal.id)) return prev;
            return [...prev, meal];
        });
    }, []);

    const removeMeal = useCallback((id: string) => {
        setSelectedMeals(prev => prev.filter(m => m.id !== id));
        setMealServings(prev => {
            const { [id]: _removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const hasMeal = useCallback((id: string) => selectedMeals.some(m => m.id === id), [selectedMeals]);

    const clearMeals = useCallback(() => {
        setSelectedMeals([]);
        setMealServings({});
    }, []);

    const setServings = useCallback((mealId: string, count: number) => {
        setMealServings(prev => ({ ...prev, [mealId]: Math.max(1, count) }));
    }, []);

    const setMealPrepDays = useCallback((days: number) => {
        setMealPrepDaysState(Math.max(1, Math.min(7, days)));
    }, []);

    const contextValue = useMemo(() => ({
        selectedMeals, addMeal, removeMeal, hasMeal, clearMeals,
        mealServings, setServings, mealPrepDays, setMealPrepDays,
    }), [selectedMeals, addMeal, removeMeal, hasMeal, clearMeals,
        mealServings, setServings, mealPrepDays, setMealPrepDays]);

    return (
        <GroceryContext.Provider value={contextValue}>
            {children}
        </GroceryContext.Provider>
    );
};

export const useGrocery = () => {
    const ctx = useContext(GroceryContext);
    if (!ctx) throw new Error("useGrocery must be used inside GroceryProvider");
    return ctx;
};

/** Safe version — returns undefined when used outside GroceryProvider */
export const useGroceryOptional = () => useContext(GroceryContext);
