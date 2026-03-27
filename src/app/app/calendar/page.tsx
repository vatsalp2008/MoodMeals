"use client";

import { useState, useMemo, useCallback } from "react";
import { useMealCalendar, PlannedMeal } from "@/context/MealCalendarContext";
import { useStressCalendar } from "@/context/StressCalendarContext";
import { useGrocery } from "@/context/GroceryContext";
import EventInput from "@/components/EventInput";
import type { MealType, CalendarEvent } from "@/types";
import styles from "./page.module.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEAL_SLOTS: { type: MealType; label: string; icon: string }[] = [
    { type: "breakfast", label: "Breakfast", icon: "🌅" },
    { type: "lunch", label: "Lunch", icon: "🥗" },
    { type: "dinner", label: "Dinner", icon: "🍽" },
    { type: "snack", label: "Snack", icon: "🍎" },
];

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return toDateStr(d);
}

/** Get Monday of the week containing dateStr */
function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday-based week
    d.setDate(d.getDate() + diff);
    return toDateStr(d);
}

function getMonthDays(year: number, month: number): (string | null)[] {
    const first = new Date(year, month, 1);
    const startDay = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];

    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        const m = String(month + 1).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        cells.push(`${year}-${m}-${dd}`);
    }
    return cells;
}

function formatWeekRange(startStr: string): string {
    const s = new Date(startStr + "T00:00:00");
    const e = new Date(startStr + "T00:00:00");
    e.setDate(e.getDate() + 6);
    const sMonth = MONTH_NAMES[s.getMonth()];
    const eMonth = MONTH_NAMES[e.getMonth()];
    if (s.getMonth() === e.getMonth()) {
        return `${sMonth} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}, ${e.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Add Meal Modal
// ---------------------------------------------------------------------------

interface AddModalProps {
    date: string;
    mealType: MealType;
    onClose: () => void;
}

function AddMealModal({ date, mealType, onClose }: AddModalProps) {
    const { addMealToDate } = useMealCalendar();
    const grocery = useGrocery();
    const [customName, setCustomName] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);

    const recentMeals = grocery.selectedMeals;

    const handleAdd = () => {
        if (selectedId) {
            const meal = recentMeals.find((m) => m.id === selectedId);
            if (meal) {
                addMealToDate(
                    { mealId: meal.id, mealName: meal.name },
                    date,
                    selectedMealType,
                );
            }
        } else if (customName.trim()) {
            const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            addMealToDate(
                { mealId: id, mealName: customName.trim() },
                date,
                selectedMealType,
            );
        }
        onClose();
    };

    const canAdd = selectedId || customName.trim();
    const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    return (
        <div
            className={styles.modalOverlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-meal-title"
            >
                <button
                    className={styles.modalClose}
                    onClick={onClose}
                    aria-label="Close"
                >
                    x
                </button>
                <h2 id="add-meal-title" className={styles.modalTitle}>
                    Add Meal
                </h2>
                <p className={styles.modalSubtitle}>{dayLabel}</p>

                {/* Meal type selector */}
                <div className={styles.modalMealTypeRow}>
                    {MEAL_SLOTS.map((slot) => (
                        <button
                            key={slot.type}
                            className={`${styles.mealTypeBtn} ${selectedMealType === slot.type ? styles.mealTypeBtnActive : ""}`}
                            onClick={() => setSelectedMealType(slot.type)}
                        >
                            {slot.icon} {slot.label}
                        </button>
                    ))}
                </div>

                {/* Recent meals from grocery list */}
                {recentMeals.length > 0 && (
                    <>
                        <span className={styles.recentLabel}>
                            From your grocery list
                        </span>
                        <div className={styles.recentList}>
                            {recentMeals.map((meal) => (
                                <button
                                    key={meal.id}
                                    className={`${styles.recentItem} ${selectedId === meal.id ? styles.recentItemActive : ""}`}
                                    onClick={() => {
                                        setSelectedId(
                                            selectedId === meal.id
                                                ? null
                                                : meal.id,
                                        );
                                        setCustomName("");
                                    }}
                                >
                                    <span className={styles.recentItemName}>
                                        {meal.name}
                                    </span>
                                    <span className={styles.recentItemType}>
                                        {meal.mealType}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.orDivider}>or</div>
                    </>
                )}

                {/* Custom meal name */}
                <span className={styles.customNameLabel}>
                    Type a meal name
                </span>
                <input
                    className={styles.modalInput}
                    type="text"
                    placeholder="e.g. Grilled salmon with quinoa"
                    value={customName}
                    onChange={(e) => {
                        setCustomName(e.target.value);
                        setSelectedId(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && canAdd) handleAdd();
                    }}
                />

                <button
                    className={styles.modalAddBtn}
                    onClick={handleAdd}
                    disabled={!canAdd}
                >
                    Add to Calendar
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------

interface WeekViewProps {
    weekStart: string;
    today: string;
    onAddClick: (date: string, mealType: MealType) => void;
    stressEvents: CalendarEvent[];
}

function WeekView({ weekStart, today, onAddClick, stressEvents }: WeekViewProps) {
    const { getMealsForWeek, removeMealFromDate } = useMealCalendar();
    const weekMeals = getMealsForWeek(weekStart);

    const days = useMemo(() => {
        const result: string[] = [];
        for (let i = 0; i < 7; i++) {
            result.push(addDays(weekStart, i));
        }
        return result;
    }, [weekStart]);

    // Group stress events by date string
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const evt of stressEvents) {
            const dateKey = evt.date;
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(evt);
        }
        return map;
    }, [stressEvents]);

    return (
        <div className={styles.weekGrid}>
            {days.map((dateStr) => {
                const d = new Date(dateStr + "T00:00:00");
                const isToday = dateStr === today;
                const isPast = dateStr < today;
                const dayMeals = weekMeals[dateStr] || [];
                const dayEvents = eventsByDate[dateStr] || [];

                return (
                    <div
                        key={dateStr}
                        className={`${styles.dayColumn} ${isToday ? styles.dayColumnToday : ""} ${isPast ? styles.dayColumnPast : ""}`}
                    >
                        <div className={styles.dayHeader}>
                            <div className={styles.dayName}>
                                {DAY_NAMES_SHORT[d.getDay()]}
                            </div>
                            <div className={styles.dayNumber}>
                                {d.getDate()}
                            </div>
                        </div>
                        {/* Stress events for this day */}
                        {dayEvents.length > 0 && (
                            <div className={styles.dayEvents}>
                                {dayEvents.map((evt) => {
                                    const icon = evt.type === "deadline" ? "\u23F0" : "\uD83D\uDCC5";
                                    const label = evt.type === "deadline"
                                        ? `Deadline: ${evt.title}`
                                        : evt.title;
                                    const stressClass =
                                        evt.stressLevel === "high"
                                            ? styles.eventPillHigh
                                            : evt.stressLevel === "medium"
                                              ? styles.eventPillMedium
                                              : styles.eventPillLow;
                                    return (
                                        <div
                                            key={evt.id}
                                            className={`${styles.eventPill} ${stressClass}`}
                                            title={`${evt.type}: ${evt.title}${evt.time ? ` at ${evt.time}` : ""}`}
                                        >
                                            <span className={styles.eventPillIcon}>{icon}</span>
                                            <span className={styles.eventPillText}>{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className={styles.daySlots}>
                            {MEAL_SLOTS.map((slot) => {
                                const meals = dayMeals.filter(
                                    (m: PlannedMeal) =>
                                        m.mealType === slot.type,
                                );
                                return (
                                    <div
                                        key={slot.type}
                                        className={styles.slotSection}
                                    >
                                        <span className={styles.slotLabel}>
                                            {slot.icon} {slot.label}
                                        </span>
                                        {meals.map((meal: PlannedMeal) => (
                                            <div
                                                key={meal.mealId}
                                                className={styles.mealChip}
                                            >
                                                <span
                                                    className={
                                                        styles.mealChipName
                                                    }
                                                    title={meal.mealName}
                                                >
                                                    {meal.mealName}
                                                </span>
                                                {!isPast && (
                                                    <button
                                                        className={styles.removeBtn}
                                                        onClick={() =>
                                                            removeMealFromDate(
                                                                meal.mealId,
                                                                dateStr,
                                                            )
                                                        }
                                                        aria-label={`Remove ${meal.mealName}`}
                                                        title="Remove"
                                                    >
                                                        x
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {meals.length === 0 && !isPast && (
                                            <button
                                                className={styles.emptySlot}
                                                onClick={() =>
                                                    onAddClick(
                                                        dateStr,
                                                        slot.type,
                                                    )
                                                }
                                                aria-label={`Add ${slot.label} for ${dateStr}`}
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Month View
// ---------------------------------------------------------------------------

interface MonthViewProps {
    year: number;
    month: number;
    today: string;
    onDayClick: (dateStr: string) => void;
    stressEvents: CalendarEvent[];
}

function MonthView({ year, month, today, onDayClick, stressEvents }: MonthViewProps) {
    const { plannedMeals } = useMealCalendar();
    const cells = useMemo(() => getMonthDays(year, month), [year, month]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const evt of stressEvents) {
            if (!map[evt.date]) map[evt.date] = [];
            map[evt.date].push(evt);
        }
        return map;
    }, [stressEvents]);

    return (
        <div className={styles.monthGrid}>
            <div className={styles.monthHeader}>
                {DAY_NAMES_SHORT.map((d) => (
                    <div key={d} className={styles.monthDayLabel}>
                        {d}
                    </div>
                ))}
            </div>
            <div className={styles.monthDays}>
                {cells.map((dateStr, i) => {
                    if (!dateStr) {
                        return (
                            <div
                                key={`empty-${i}`}
                                className={`${styles.monthDay} ${styles.monthDayEmpty}`}
                            />
                        );
                    }
                    const isToday = dateStr === today;
                    const meals = plannedMeals[dateStr] ?? [];
                    const dayEvents = eventsByDate[dateStr] ?? [];
                    const dayNum = new Date(
                        dateStr + "T00:00:00",
                    ).getDate();
                    const uniqueTypes = [
                        ...new Set(meals.map((m: PlannedMeal) => m.mealType)),
                    ];
                    const hasEvents = dayEvents.length > 0;

                    return (
                        <button
                            key={dateStr}
                            className={`${styles.monthDay} ${isToday ? styles.monthDayToday : ""} ${hasEvents ? styles.monthDayHasEvent : ""}`}
                            onClick={() => onDayClick(dateStr)}
                            aria-label={`${dateStr}, ${meals.length} meals${hasEvents ? `, ${dayEvents.length} event${dayEvents.length !== 1 ? "s" : ""}` : ""}`}
                        >
                            {dayNum}
                            <div className={styles.monthDayDots}>
                                {uniqueTypes.slice(0, 4).map((t) => (
                                    <span
                                        key={t}
                                        className={styles.monthDayDot}
                                    />
                                ))}
                                {dayEvents.slice(0, 2).map((evt) => (
                                    <span
                                        key={evt.id}
                                        className={styles.monthDayDotEvent}
                                        title={evt.title}
                                    />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Calendar Page
// ---------------------------------------------------------------------------

type ViewMode = "week" | "month";

export default function CalendarPage() {
    const todayStr = toDateStr(new Date());
    const { events: stressEvents } = useStressCalendar();
    const [view, setView] = useState<ViewMode>("week");
    const [weekStart, setWeekStart] = useState(() => getWeekStart(todayStr));
    const [monthYear, setMonthYear] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    // Add modal state
    const [addModal, setAddModal] = useState<{
        date: string;
        mealType: MealType;
    } | null>(null);

    const goToday = useCallback(() => {
        const t = toDateStr(new Date());
        setWeekStart(getWeekStart(t));
        setMonthYear({
            year: new Date().getFullYear(),
            month: new Date().getMonth(),
        });
    }, []);

    const prevWeek = () => setWeekStart((s) => addDays(s, -7));
    const nextWeek = () => setWeekStart((s) => addDays(s, 7));

    const prevMonth = () =>
        setMonthYear((s) => {
            const m = s.month - 1;
            return m < 0
                ? { year: s.year - 1, month: 11 }
                : { year: s.year, month: m };
        });
    const nextMonth = () =>
        setMonthYear((s) => {
            const m = s.month + 1;
            return m > 11
                ? { year: s.year + 1, month: 0 }
                : { year: s.year, month: m };
        });

    const handleMonthDayClick = (dateStr: string) => {
        setWeekStart(getWeekStart(dateStr));
        setView("week");
    };

    const handleAddClick = (date: string, mealType: MealType) => {
        setAddModal({ date, mealType });
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Meal Calendar</h1>
                <p className={styles.subtitle}>
                    Plan your meals and track upcoming events
                </p>
            </div>

            {/* Event Input — add upcoming events directly on the calendar page */}
            <div className={styles.eventInputWrap}>
                <EventInput />
            </div>

            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.navGroup}>
                    <button
                        className={styles.navBtn}
                        onClick={view === "week" ? prevWeek : prevMonth}
                        aria-label="Previous"
                    >
                        &lsaquo;
                    </button>
                    <button
                        className={styles.todayBtn}
                        onClick={goToday}
                    >
                        Today
                    </button>
                    <button
                        className={styles.navBtn}
                        onClick={view === "week" ? nextWeek : nextMonth}
                        aria-label="Next"
                    >
                        &rsaquo;
                    </button>
                </div>

                <span className={styles.weekLabel}>
                    {view === "week"
                        ? formatWeekRange(weekStart)
                        : `${MONTH_NAMES[monthYear.month]} ${monthYear.year}`}
                </span>

                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.viewBtn} ${view === "week" ? styles.viewBtnActive : ""}`}
                        onClick={() => setView("week")}
                    >
                        Week
                    </button>
                    <button
                        className={`${styles.viewBtn} ${view === "month" ? styles.viewBtnActive : ""}`}
                        onClick={() => setView("month")}
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* Views */}
            {view === "week" && (
                <WeekView
                    weekStart={weekStart}
                    today={todayStr}
                    onAddClick={handleAddClick}
                    stressEvents={stressEvents}
                />
            )}
            {view === "month" && (
                <MonthView
                    year={monthYear.year}
                    month={monthYear.month}
                    today={todayStr}
                    onDayClick={handleMonthDayClick}
                    stressEvents={stressEvents}
                />
            )}

            {/* Add Meal Modal */}
            {addModal && (
                <AddMealModal
                    date={addModal.date}
                    mealType={addModal.mealType}
                    onClose={() => setAddModal(null)}
                />
            )}
        </div>
    );
}
