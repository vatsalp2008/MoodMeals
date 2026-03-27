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
import type { MealType } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlannedMeal {
    mealId: string;
    mealName: string;
    mealType: MealType;
    date: string; // YYYY-MM-DD
    addedAt: string; // ISO string
}

interface MealCalendarContextType {
    plannedMeals: Record<string, PlannedMeal[]>;
    addMealToDate: (
        meal: { mealId: string; mealName: string },
        date: string,
        mealType: MealType,
    ) => void;
    removeMealFromDate: (mealId: string, date: string) => void;
    getMealsForDate: (date: string) => PlannedMeal[];
    getMealsForWeek: (startDate: string) => Record<string, PlannedMeal[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "moodmeals_meal_calendar";

function loadPlannedMeals(): Record<string, PlannedMeal[]> {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, PlannedMeal[]>) : {};
    } catch {
        return {};
    }
}

function savePlannedMeals(meals: Record<string, PlannedMeal[]>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MealCalendarContext = createContext<MealCalendarContextType | undefined>(
    undefined,
);

export const MealCalendarProvider = ({ children }: { children: ReactNode }) => {
    const [plannedMeals, setPlannedMeals] = useState<
        Record<string, PlannedMeal[]>
    >({});
    const [mounted, setMounted] = useState(false);

    // Hydrate from localStorage on mount
    useEffect(() => {
        setPlannedMeals(loadPlannedMeals());
        setMounted(true);
    }, []);

    // Persist whenever planned meals change
    useEffect(() => {
        if (mounted) {
            savePlannedMeals(plannedMeals);
        }
    }, [plannedMeals, mounted]);

    const addMealToDate = useCallback(
        (
            meal: { mealId: string; mealName: string },
            date: string,
            mealType: MealType,
        ) => {
            const planned: PlannedMeal = {
                mealId: meal.mealId,
                mealName: meal.mealName,
                mealType,
                date,
                addedAt: new Date().toISOString(),
            };
            setPlannedMeals((prev) => {
                const existing = prev[date] ?? [];
                // Prevent duplicate: same meal + same type on same date
                if (
                    existing.some(
                        (m) =>
                            m.mealId === meal.mealId && m.mealType === mealType,
                    )
                ) {
                    return prev;
                }
                return { ...prev, [date]: [...existing, planned] };
            });
        },
        [],
    );

    const removeMealFromDate = useCallback(
        (mealId: string, date: string) => {
            setPlannedMeals((prev) => {
                const existing = prev[date];
                if (!existing) return prev;
                const filtered = existing.filter((m) => m.mealId !== mealId);
                if (filtered.length === 0) {
                    const { [date]: _removed, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [date]: filtered };
            });
        },
        [],
    );

    const getMealsForDate = useCallback(
        (date: string): PlannedMeal[] => {
            return plannedMeals[date] ?? [];
        },
        [plannedMeals],
    );

    const getMealsForWeek = useCallback(
        (startDate: string): Record<string, PlannedMeal[]> => {
            const result: Record<string, PlannedMeal[]> = {};
            for (let i = 0; i < 7; i++) {
                const day = addDays(startDate, i);
                result[day] = plannedMeals[day] ?? [];
            }
            return result;
        },
        [plannedMeals],
    );

    const contextValue = useMemo(() => ({
        plannedMeals,
        addMealToDate,
        removeMealFromDate,
        getMealsForDate,
        getMealsForWeek,
    }), [plannedMeals, addMealToDate, removeMealFromDate, getMealsForDate, getMealsForWeek]);

    return (
        <MealCalendarContext.Provider value={contextValue}>
            {children}
        </MealCalendarContext.Provider>
    );
};

export const useMealCalendar = () => {
    const ctx = useContext(MealCalendarContext);
    if (!ctx)
        throw new Error(
            "useMealCalendar must be used inside MealCalendarProvider",
        );
    return ctx;
};
