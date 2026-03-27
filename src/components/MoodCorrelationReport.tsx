"use client";

import React, { useMemo } from "react";
import { JournalEntry } from "@/context/JournalContext";
import { MEALS } from "@/data/meals";
import styles from "./MoodCorrelationReport.module.css";

/* ────────────────────────────────────────────
 * 1. Mood scoring helpers
 * ──────────────────────────────────────────── */

const MOOD_SCORE: Record<string, number> = {
    sad: 1,
    stressed: 2,
    tired: 2,
    calm: 4,
    focused: 5,
    happy: 6,
    energetic: 6,
};

const POSITIVE_MOODS = new Set(["calm", "focused", "happy", "energetic"]);

const moodToScore = (emotion: string): number =>
    MOOD_SCORE[emotion.toLowerCase()] ?? 3;

/* Nutrient descriptions mapped to meals by keyword match on meal description */
const NUTRIENT_KEYWORDS: Record<string, string[]> = {
    Magnesium: ["magnesium"],
    "Omega-3": ["omega-3", "omega", "dha"],
    Iron: ["iron"],
    Protein: ["protein"],
    Fiber: ["fiber"],
    Antioxidants: ["antioxidant", "antioxidants"],
    "Healthy Fats": ["healthy fat", "avocado"],
    "Chlorophyll": ["chlorophyll", "greens"],
};

function getNutrients(mealId: string): string[] {
    const meal = MEALS.find((m) => m.id === mealId);
    if (!meal) return [];
    const desc = meal.description.toLowerCase();
    const found: string[] = [];
    for (const [nutrient, keywords] of Object.entries(NUTRIENT_KEYWORDS)) {
        if (keywords.some((kw) => desc.includes(kw))) {
            found.push(nutrient);
        }
    }
    return found;
}

/* ────────────────────────────────────────────
 * 2. Analysis types
 * ──────────────────────────────────────────── */

interface MealCorrelation {
    mealName: string;
    mealId: string;
    timesEaten: number;
    avgMoodLift: number; // positive = mood got better after this meal
    improvementRate: number; // 0-1
}

interface NutrientInsight {
    nutrient: string;
    improvementRate: number;
    occurrences: number;
}

interface AnalysisResult {
    daysTracked: number;
    daysImproved: number;
    topMeals: MealCorrelation[];
    nutrientInsights: NutrientInsight[];
    patternInsight: string;
}

/* ────────────────────────────────────────────
 * 3. Core analysis function
 * ──────────────────────────────────────────── */

function analyzeCorrelations(entries: JournalEntry[]): AnalysisResult | null {
    if (entries.length < 3) return null;

    // Sort chronologically
    const sorted = [...entries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Group by date (YYYY-MM-DD)
    const byDate = new Map<string, JournalEntry[]>();
    for (const entry of sorted) {
        const day = entry.date.slice(0, 10);
        const arr = byDate.get(day) ?? [];
        arr.push(entry);
        byDate.set(day, arr);
    }

    const days = Array.from(byDate.keys()).sort();
    let daysImproved = 0;

    // Track per-meal stats
    const mealStats = new Map<
        string,
        { mealName: string; mealId: string; lifts: number[]; count: number }
    >();

    // Track per-nutrient stats
    const nutrientStats = new Map<
        string,
        { improved: number; total: number }
    >();

    // Time-of-day tracking (simple heuristic: entry order within a day)
    const timeOfDayScores: { morning: number[]; afternoon: number[]; evening: number[] } = {
        morning: [],
        afternoon: [],
        evening: [],
    };

    for (let i = 0; i < days.length; i++) {
        const dayEntries = byDate.get(days[i])!;

        // Check if mood improved during this day
        if (dayEntries.length >= 2) {
            const firstScore = moodToScore(dayEntries[0].emotion);
            const lastScore = moodToScore(dayEntries[dayEntries.length - 1].emotion);
            if (lastScore > firstScore) daysImproved++;
        } else if (i > 0) {
            // Compare with previous day's last entry
            const prevDayEntries = byDate.get(days[i - 1])!;
            const prevScore = moodToScore(
                prevDayEntries[prevDayEntries.length - 1].emotion,
            );
            const currScore = moodToScore(dayEntries[0].emotion);
            if (currScore > prevScore) daysImproved++;
        }

        // Analyze meal-to-mood correlations within each day
        for (let j = 0; j < dayEntries.length; j++) {
            const entry = dayEntries[j];
            if (!entry.mealName || !entry.mealId) continue;

            const scoreBefore =
                j > 0
                    ? moodToScore(dayEntries[j - 1].emotion)
                    : i > 0
                      ? moodToScore(
                            byDate.get(days[i - 1])!.slice(-1)[0].emotion,
                        )
                      : moodToScore(entry.emotion);

            const scoreAfter =
                j < dayEntries.length - 1
                    ? moodToScore(dayEntries[j + 1].emotion)
                    : moodToScore(entry.emotion);

            const lift = scoreAfter - scoreBefore;

            const key = entry.mealId;
            const existing = mealStats.get(key) ?? {
                mealName: entry.mealName,
                mealId: entry.mealId,
                lifts: [],
                count: 0,
            };
            existing.lifts.push(lift);
            existing.count++;
            mealStats.set(key, existing);

            // Nutrient correlation
            const nutrients = getNutrients(entry.mealId);
            for (const n of nutrients) {
                const ns = nutrientStats.get(n) ?? { improved: 0, total: 0 };
                ns.total++;
                if (lift > 0) ns.improved++;
                nutrientStats.set(n, ns);
            }

            // Time-of-day heuristic based on entry hour
            const hour = new Date(entry.date).getHours();
            const bucket =
                hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
            timeOfDayScores[bucket].push(scoreAfter);
        }
    }

    // Compute top meals
    const topMeals: MealCorrelation[] = Array.from(mealStats.values())
        .map((s) => ({
            mealName: s.mealName,
            mealId: s.mealId,
            timesEaten: s.count,
            avgMoodLift:
                s.lifts.reduce((a, b) => a + b, 0) / s.lifts.length,
            improvementRate:
                s.lifts.filter((l) => l > 0).length / s.lifts.length,
        }))
        .sort((a, b) => b.avgMoodLift - a.avgMoodLift)
        .slice(0, 5);

    // Compute nutrient insights
    const nutrientInsights: NutrientInsight[] = Array.from(
        nutrientStats.entries(),
    )
        .map(([nutrient, s]) => ({
            nutrient,
            improvementRate: s.total > 0 ? s.improved / s.total : 0,
            occurrences: s.total,
        }))
        .filter((n) => n.occurrences >= 1)
        .sort((a, b) => b.improvementRate - a.improvementRate)
        .slice(0, 4);

    // Generate pattern insight
    let patternInsight = "";
    const avgByTime = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const morningAvg = avgByTime(timeOfDayScores.morning);
    const afternoonAvg = avgByTime(timeOfDayScores.afternoon);
    const eveningAvg = avgByTime(timeOfDayScores.evening);

    if (morningAvg > afternoonAvg && morningAvg > eveningAvg && timeOfDayScores.morning.length > 0) {
        patternInsight =
            "You tend to feel your best after morning meals. Starting the day with a nourishing breakfast seems to set a positive tone.";
    } else if (afternoonAvg > morningAvg && afternoonAvg > eveningAvg && timeOfDayScores.afternoon.length > 0) {
        patternInsight =
            "Your mood lifts most after lunch. A balanced midday meal appears to be your sweet spot.";
    } else if (eveningAvg > 0 && timeOfDayScores.evening.length > 0) {
        patternInsight =
            "Evening meals tend to bring you the most calm. A comforting dinner seems to ease your day.";
    }

    // If we have positive mood data but no time pattern, try emotion pattern
    if (!patternInsight) {
        const positiveMealEntries = sorted.filter(
            (e) => e.mealName && POSITIVE_MOODS.has(e.emotion),
        );
        if (positiveMealEntries.length > 0) {
            const mostCommonPositiveMood = positiveMealEntries.reduce(
                (acc, e) => {
                    acc[e.emotion] = (acc[e.emotion] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>,
            );
            const topMood = Object.entries(mostCommonPositiveMood).sort(
                (a, b) => b[1] - a[1],
            )[0];
            if (topMood) {
                patternInsight = `Your most common positive mood after meals is "${topMood[0]}". Keep choosing foods that bring out that feeling.`;
            }
        }
    }

    if (!patternInsight) {
        patternInsight =
            "Keep logging meals and moods to uncover your personal patterns.";
    }

    return {
        daysTracked: days.length,
        daysImproved,
        topMeals,
        nutrientInsights,
        patternInsight,
    };
}

/* ────────────────────────────────────────────
 * 4. Sub-components
 * ──────────────────────────────────────────── */

/** SVG progress ring */
const ProgressRing: React.FC<{ percent: number; size?: number }> = ({
    percent,
    size = 88,
}) => {
    const stroke = 7;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <svg width={size} height={size} className={styles.ring}>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--beige-dark)"
                strokeWidth={stroke}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--sage)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className={styles.ringProgress}
            />
            <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                className={styles.ringText}
            >
                {Math.round(percent)}%
            </text>
        </svg>
    );
};

/* ────────────────────────────────────────────
 * 5. Main component
 * ──────────────────────────────────────────── */

interface MoodCorrelationReportProps {
    entries: JournalEntry[];
}

const MoodCorrelationReport: React.FC<MoodCorrelationReportProps> = ({
    entries,
}) => {
    const result = useMemo(() => analyzeCorrelations(entries), [entries]);

    // Not enough data
    if (!result) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" stroke="var(--sage-light)" strokeWidth="2" strokeDasharray="6 4" />
                        <path d="M16 28c0 0 3 4 8 4s8-4 8-4" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="18" cy="20" r="2" fill="var(--sage)" />
                        <circle cx="30" cy="20" r="2" fill="var(--sage)" />
                    </svg>
                </div>
                <p className={styles.emptyText}>
                    Keep logging your meals and moods — insights will appear
                    after a few entries!
                </p>
            </div>
        );
    }

    const improvementPct =
        result.daysTracked > 0
            ? (result.daysImproved / result.daysTracked) * 100
            : 0;

    const hasMealData = result.topMeals.length > 0;

    return (
        <div className={styles.report}>
            <h3 className={styles.reportTitle}>
                Weekly Mood-Food Correlation
            </h3>

            <div className={styles.grid}>
                {/* ── (a) Weekly Summary Card ─────────────── */}
                <div className={`${styles.card} ${styles.summaryCard}`}>
                    <div className={styles.summaryContent}>
                        <ProgressRing percent={improvementPct} />
                        <div className={styles.summaryText}>
                            <span className={styles.summaryHighlight}>
                                {result.daysImproved} of {result.daysTracked}
                            </span>{" "}
                            days your mood improved
                            {hasMealData
                                ? " after eating tracked meals."
                                : "."}
                        </div>
                    </div>
                </div>

                {/* ── (b) Top Mood-Boosting Meals ───────── */}
                {hasMealData && (
                    <div className={`${styles.card} ${styles.mealsCard}`}>
                        <h4 className={styles.cardTitle}>
                            Top Mood-Boosting Meals
                        </h4>
                        <ul className={styles.mealList}>
                            {result.topMeals.map((m) => (
                                <li key={m.mealId} className={styles.mealItem}>
                                    <div className={styles.mealInfo}>
                                        <span className={styles.mealName}>
                                            {m.mealName}
                                        </span>
                                        <span className={styles.mealMeta}>
                                            {m.timesEaten}x eaten
                                        </span>
                                    </div>
                                    <div className={styles.mealLift}>
                                        <span
                                            className={
                                                m.avgMoodLift > 0
                                                    ? styles.liftPositive
                                                    : m.avgMoodLift < 0
                                                      ? styles.liftNegative
                                                      : styles.liftNeutral
                                            }
                                        >
                                            {m.avgMoodLift > 0 ? "+" : ""}
                                            {m.avgMoodLift.toFixed(1)}
                                        </span>
                                        <span className={styles.liftLabel}>
                                            mood lift
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── (c) Nutrient Insights ──────────────── */}
                {result.nutrientInsights.length > 0 && (
                    <div className={`${styles.card} ${styles.nutrientCard}`}>
                        <h4 className={styles.cardTitle}>Nutrient Insights</h4>
                        <ul className={styles.nutrientList}>
                            {result.nutrientInsights.map((n) => (
                                <li
                                    key={n.nutrient}
                                    className={styles.nutrientItem}
                                >
                                    <div className={styles.nutrientBar}>
                                        <div
                                            className={styles.nutrientFill}
                                            style={{
                                                width: `${Math.round(n.improvementRate * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className={styles.nutrientLabel}>
                                        <strong>{n.nutrient}</strong>-rich meals
                                        improved your mood{" "}
                                        {Math.round(n.improvementRate * 100)}%
                                        of the time
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── (d) Mood Pattern Insight ───────────── */}
                <div className={`${styles.card} ${styles.patternCard}`}>
                    <h4 className={styles.cardTitle}>Mood Pattern</h4>
                    <p className={styles.patternText}>
                        {result.patternInsight}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MoodCorrelationReport;
