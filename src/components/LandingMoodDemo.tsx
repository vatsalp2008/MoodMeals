"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MEALS } from "@/data/meals";
import { MealPreference, MoodAnalysis } from "@/types";
import styles from "./LandingMoodDemo.module.css";

const EMOTION_EMOJIS: Record<string, string> = {
    stressed: "😤", tired: "😴", anxious: "😰", happy: "😊",
    focused: "🎯", calm: "😌", sad: "😢", energetic: "⚡",
};

export default function LandingMoodDemo() {
    const [text, setText] = useState("");
    const [preference, setPreference] = useState<MealPreference>("veg");
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        setLoading(true);
        setError("");
        setAnalysis(null);

        try {
            const res = await fetch("/api/analyze-mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: trimmed }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Analysis failed.");
            }
            setAnalysis(await res.json());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // Pick top 3 meals matching the analysis
    const resultMeals = (() => {
        if (!analysis) return [];
        // non-veg sees all; veg sees veg + vegan; vegan sees only vegan
        const byPref = MEALS.filter(m =>
            preference === "non-veg" ? true
            : preference === "veg" ? m.preference === "veg" || m.preference === "vegan"
            : m.preference === "vegan"
        );
        const matched = byPref.filter(m =>
            m.moodSync.some(tag => analysis.recommendedMoods.includes(tag))
        );
        const pool = matched.length > 0 ? matched : byPref;
        return pool
            .map(m => ({
                ...m,
                score: m.moodSync.filter(t => analysis.recommendedMoods.includes(t)).length,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    })();

    return (
        <section id="try" className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.label}>TRY IT NOW</span>
                    <h2 className={styles.title}>See it in action.</h2>
                    <p className={styles.subtitle}>
                        Type how you&apos;re feeling and get instant meal ideas — no account needed.
                    </p>
                </div>

                <div className={styles.card}>
                    {error && (
                        <div className={styles.errorBanner}>⚠️ {error}</div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <textarea
                            className={styles.textarea}
                            placeholder="e.g. 'I'm exhausted from work and just want something warm and comforting…'"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            disabled={loading}
                            rows={3}
                        />

                        <div className={styles.controls}>
                            <div className={styles.prefGroup}>
                                {(["veg", "non-veg", "vegan"] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`${styles.prefBtn} ${preference === p ? styles.prefActive : ""}`}
                                        onClick={() => setPreference(p)}
                                    >
                                        {p === "veg" ? "🥗 Veg" : p === "non-veg" ? "🍗 Non-Veg" : "🌱 Vegan"}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={!text.trim() || loading}
                            >
                                {loading ? "Analyzing…" : "Get Meals →"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results */}
                {analysis && resultMeals.length > 0 && (
                    <div className={styles.results}>
                        <div className={styles.analysisBanner}>
                            <span className={styles.emotionPill}>
                                {EMOTION_EMOJIS[analysis.emotion] ?? "🧠"} {analysis.emotion}
                            </span>
                            <p className={styles.analysisMsg}>{analysis.message}</p>
                        </div>

                        <div className={styles.mealGrid}>
                            {resultMeals.map((meal, i) => (
                                <div
                                    key={meal.id}
                                    className={styles.mealCard}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    <div className={styles.mealImg}>
                                        <Image
                                            src={meal.image}
                                            alt={meal.name}
                                            fill
                                            className={styles.mealImgEl}
                                        />
                                    </div>
                                    <div className={styles.mealBody}>
                                        <h3 className={styles.mealName}>{meal.name}</h3>
                                        <p className={styles.mealDesc}>{meal.description}</p>
                                        <div className={styles.mealMeta}>
                                            <div className={styles.moodTags}>
                                                <span className={`${styles.moodTag} ${styles[`pref-${meal.preference}`]}`}>
                                                    {meal.preference === "veg" ? "🥗 Veg" : meal.preference === "vegan" ? "🌱 Vegan" : "🍗 Non-Veg"}
                                                </span>
                                                {meal.moodSync.slice(0, 2).map(tag => (
                                                    <span key={tag} className={styles.moodTag}>{tag}</span>
                                                ))}
                                            </div>
                                            <span className={styles.mealCal}>{meal.calories} kcal</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.seeAll}>
                            <Link href="/app" className={styles.seeAllLink}>
                                See all recommendations in the app →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
