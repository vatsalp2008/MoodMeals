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
import type {
    CalendarEvent,
    CalendarEventType,
    StressLevel,
    StressIntervention,
    MealTime,
} from "../types";

// ---------------------------------------------------------------------------
// Nutrient mappings (aligned with MoodMeals clinical states)
// ---------------------------------------------------------------------------

const NUTRIENT_MAP: Record<CalendarEventType, string[]> = {
    exam: ["iron", "B12", "DHA", "omega-3"],
    deadline: ["magnesium", "zinc", "B6"],
    presentation: ["zinc", "magnesium", "iron", "tyrosine"],
    meeting: ["B-vitamins", "magnesium"],
    other: ["magnesium"],
};

const STRESS_BY_TYPE: Record<CalendarEventType, StressLevel> = {
    exam: "high",
    deadline: "high",
    presentation: "high",
    meeting: "medium",
    other: "low",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "moodmeals_calendar_events";

function loadEvents(): CalendarEvent[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
    } catch {
        return [];
    }
}

function saveEvents(events: CalendarEvent[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Return the Date object for a CalendarEvent */
function eventToDate(evt: CalendarEvent): Date {
    const d = new Date(evt.date);
    if (evt.time) {
        const [h, m] = evt.time.split(":").map(Number);
        d.setHours(h, m, 0, 0);
    } else {
        // If no time given, assume 9 AM
        d.setHours(9, 0, 0, 0);
    }
    return d;
}

/** Determine the best meal time before the event */
function suggestMealTime(hoursUntil: number, eventDate: Date): MealTime {
    // We want to eat 2-4 hours before the event.
    // Calculate the suggested eating hour.
    const eatDate = new Date(eventDate.getTime() - 3 * 60 * 60 * 1000); // 3h before
    const eatHour = eatDate.getHours();

    if (eatHour >= 5 && eatHour < 10) return "breakfast";
    if (eatHour >= 10 && eatHour < 14) return "lunch";
    if (eatHour >= 14 && eatHour < 17) return "snack";
    return "dinner";
}

/** Build a human-friendly reason string */
function buildReason(
    event: CalendarEvent,
    mealTime: MealTime,
    nutrients: string[],
    hoursUntil: number,
): string {
    const nutrientList = nutrients.slice(0, 3).join(", ");
    const timeframe =
        hoursUntil < 1
            ? "less than an hour"
            : hoursUntil < 24
              ? `${Math.round(hoursUntil)} hours`
              : `${Math.round(hoursUntil / 24)} day${Math.round(hoursUntil / 24) !== 1 ? "s" : ""}`;

    const typeHints: Record<CalendarEventType, string> = {
        exam: `Your exam "${event.title}" is in ${timeframe}. A ${mealTime} rich in ${nutrientList} supports cognitive stamina and mental clarity.`,
        deadline: `Your deadline "${event.title}" is in ${timeframe}. A ${mealTime} rich in ${nutrientList} helps manage cortisol and sustain focus under pressure.`,
        presentation: `Your presentation "${event.title}" is in ${timeframe}. A ${mealTime} rich in ${nutrientList} boosts dopamine for confidence and verbal fluency.`,
        meeting: `Your meeting "${event.title}" is in ${timeframe}. A balanced ${mealTime} with ${nutrientList} supports steady energy and attentiveness.`,
        other: `Your event "${event.title}" is in ${timeframe}. A ${mealTime} with ${nutrientList} helps keep stress in check.`,
    };

    return typeHints[event.type];
}

/** Generate interventions for upcoming events */
function computeInterventions(events: CalendarEvent[]): StressIntervention[] {
    const now = new Date();
    const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72h out

    const interventions: StressIntervention[] = [];

    for (const evt of events) {
        const evtDate = eventToDate(evt);
        if (evtDate <= now || evtDate > horizon) continue;

        const stress = evt.stressLevel ?? STRESS_BY_TYPE[evt.type];
        if (stress === "low") continue; // only intervene for medium/high

        const hoursUntil = (evtDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const mealTime = suggestMealTime(hoursUntil, evtDate);
        const nutrients = NUTRIENT_MAP[evt.type];

        interventions.push({
            event: { ...evt, stressLevel: stress },
            suggestedMealTime: mealTime,
            targetedNutrients: nutrients,
            reason: buildReason(evt, mealTime, nutrients, hoursUntil),
            hoursUntilEvent: Math.round(hoursUntil * 10) / 10,
        });
    }

    // Sort by soonest first
    interventions.sort((a, b) => a.hoursUntilEvent - b.hoursUntilEvent);

    return interventions;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface StressCalendarContextType {
    events: CalendarEvent[];
    interventions: StressIntervention[];
    addEvent: (
        evt: Omit<CalendarEvent, "id" | "stressLevel"> & {
            stressLevel?: StressLevel;
        },
    ) => void;
    removeEvent: (id: string) => void;
    getUpcomingEvents: () => CalendarEvent[];
    dismissIntervention: (eventId: string) => void;
    dismissedIds: string[];
}

const StressCalendarContext = createContext<StressCalendarContextType | undefined>(
    undefined,
);

export const StressCalendarProvider = ({ children }: { children: ReactNode }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    // Hydrate from localStorage on mount
    useEffect(() => {
        setEvents(loadEvents());
        setMounted(true);
    }, []);

    // Persist whenever events change (skip initial empty state before hydration)
    useEffect(() => {
        if (mounted) {
            saveEvents(events);
        }
    }, [events, mounted]);

    const addEvent = useCallback(
        (
            evt: Omit<CalendarEvent, "id" | "stressLevel"> & {
                stressLevel?: StressLevel;
            },
        ) => {
            const stress = evt.stressLevel ?? STRESS_BY_TYPE[evt.type];
            const newEvent: CalendarEvent = {
                ...evt,
                id: generateId(),
                stressLevel: stress,
            };
            setEvents((prev) => [...prev, newEvent]);
        },
        [],
    );

    const removeEvent = useCallback((id: string) => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const getUpcomingEvents = useCallback((): CalendarEvent[] => {
        const now = new Date();
        const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        return events.filter((e) => {
            const d = eventToDate(e);
            return d > now && d <= horizon;
        });
    }, [events]);

    const dismissIntervention = useCallback((eventId: string) => {
        setDismissedIds((prev) => [...prev, eventId]);
    }, []);

    const interventions = useMemo(
        () => (mounted ? computeInterventions(events) : []),
        [mounted, events],
    );

    const contextValue = useMemo(() => ({
        events,
        interventions,
        addEvent,
        removeEvent,
        getUpcomingEvents,
        dismissIntervention,
        dismissedIds,
    }), [events, interventions, addEvent, removeEvent, getUpcomingEvents, dismissIntervention, dismissedIds]);

    return (
        <StressCalendarContext.Provider value={contextValue}>
            {children}
        </StressCalendarContext.Provider>
    );
};

export const useStressCalendar = () => {
    const ctx = useContext(StressCalendarContext);
    if (!ctx)
        throw new Error(
            "useStressCalendar must be used inside StressCalendarProvider",
        );
    return ctx;
};
