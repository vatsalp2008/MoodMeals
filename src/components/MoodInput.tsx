"use client";

import React, { useState } from "react";
import { useMood, MoodAnalysis } from "../context/MoodContext";
import styles from "./MoodInput.module.css";

type MoodInputMode = "text" | "sliders";
type SustainChoice = "sustain" | "wind_down";

const deriveKeywordsFromSliders = (values: {
    stress: number;
    energy: number;
    calm: number;
    sustainChoice: SustainChoice;
}) => {
    const { stress, energy, calm, sustainChoice } = values;

    // Convert numeric slider inputs into the keyword vocabulary
    // used by the local heuristic engine in `src/app/api/analyze-mood/route.ts`.
    const stressKeywordsHigh = ["stress", "anxious", "worried", "pressure", "deadline", "busy", "overwhelmed"];
    const energyKeywordsHigh = ["energetic", "hyper", "active", "pumped", "ready", "workout", "gym", "focus", "concentration"];
    const calmKeywordsHigh = ["calm", "relax", "chill", "peace", "serene", "quiet"];

    const energyKeywordsLow = ["low energy", "tired", "exhausted", "sleepy", "drain", "fatigue", "worn out", "beat"];
    const calmKeywordsLow = ["not calm", "stressed", "anxious"];

    const parts: string[] = [];
    parts.push(sustainChoice === "sustain" ? "sustain" : "wind down");

    if (stress >= 60) parts.push(...stressKeywordsHigh);
    if (stress <= 30) parts.push("not stress");

    if (energy >= 60) parts.push(...energyKeywordsHigh);
    if (energy <= 30) parts.push(...energyKeywordsLow);

    if (calm >= 60) parts.push(...calmKeywordsHigh);
    if (calm <= 30) parts.push(...calmKeywordsLow);

    return parts.join(" ");
};

const MoodInput = () => {
    const [mode, setMode] = useState<MoodInputMode>("text");
    const [sustainChoice, setSustainChoice] = useState<SustainChoice>("sustain");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { setAnalysis, preference, setPreference } = useMood();

    const [stress, setStress] = useState(45);
    const [energy, setEnergy] = useState(55);
    const [calm, setCalm] = useState(45);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const moodText =
            mode === "text"
                ? text.trim()
                : deriveKeywordsFromSliders({ stress, energy, calm, sustainChoice });

        if (!moodText || !moodText.trim()) return;

        setLoading(true);
        setError("");
        setAnalysis(null);

        try {
            const res = await fetch("/api/analyze-mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Keep the existing API contract (`{ mood }`) but include extra fields for future use.
                body: JSON.stringify({
                    mood: moodText,
                    inputMode: mode,
                    sustainChoice,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Analysis failed.");
            }

            const data: MoodAnalysis = await res.json();
            setAnalysis(data);

            // Scroll to the meal grid after a brief pause
            setTimeout(() => {
                document.getElementById("recipes")?.scrollIntoView({ behavior: "smooth" });
            }, 400);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Something went wrong.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="mood-log" className={styles.section}>
            <div className={`container ${styles.container}`}>
                <h2 className={styles.title}>How are you feeling today?</h2>
                <p className={styles.subtitle}>
                    Tell us what&apos;s on your mind and we&apos;ll find the perfect meal to match.
                </p>

                <div className={styles.inputWrapper}>
                    {loading && <div className={`${styles.status} ${styles.visible}`}>✨ Analyzing your mood...</div>}
                    {error && <div className={`${styles.status} ${styles.errorStatus} ${styles.visible}`}>⚠️ {error}</div>}

                    <div className={styles.controls} style={{ borderTop: "none", paddingTop: 0 }}>
                        <div className={styles.preferenceGroup} style={{ justifyContent: "flex-start" }}>
                            <span className={styles.prefLabel}>Input mode:</span>
                            <button
                                type="button"
                                className={`${styles.prefBtn} ${mode === "text" ? styles.prefActive : ""}`}
                                onClick={() => setMode("text")}
                            >
                                Free text
                            </button>
                            <button
                                type="button"
                                className={`${styles.prefBtn} ${mode === "sliders" ? styles.prefActive : ""}`}
                                onClick={() => setMode("sliders")}
                            >
                                Mood sliders
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {mode === "text" ? (
                            <textarea
                                className={styles.textarea}
                                placeholder="e.g., 'I'm super stressed from work and need something warm and comforting' or 'I'm feeling great and full of energy today!'"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                disabled={loading}
                            />
                        ) : (
                            <div className={styles.sliderBlock} aria-label="Mood sliders">
                                <div className={styles.sliderRow}>
                                    <div className={styles.sliderMeta}>
                                        <span className={styles.sliderLabel}>Stress</span>
                                        <span className={styles.sliderValue}>{stress}</span>
                                    </div>
                                    <input
                                        className={styles.slider}
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={stress}
                                        onChange={(e) => setStress(Number(e.target.value))}
                                        disabled={loading}
                                    />
                                </div>

                                <div className={styles.sliderRow}>
                                    <div className={styles.sliderMeta}>
                                        <span className={styles.sliderLabel}>Energy</span>
                                        <span className={styles.sliderValue}>{energy}</span>
                                    </div>
                                    <input
                                        className={styles.slider}
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={energy}
                                        onChange={(e) => setEnergy(Number(e.target.value))}
                                        disabled={loading}
                                    />
                                </div>

                                <div className={styles.sliderRow}>
                                    <div className={styles.sliderMeta}>
                                        <span className={styles.sliderLabel}>Calm</span>
                                        <span className={styles.sliderValue}>{calm}</span>
                                    </div>
                                    <input
                                        className={styles.slider}
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={calm}
                                        onChange={(e) => setCalm(Number(e.target.value))}
                                        disabled={loading}
                                    />
                                </div>

                                <p className={styles.sliderHint}>
                                    We’ll translate these sliders into the mood vocabulary the meal recommender understands.
                                </p>
                            </div>
                        )}

                        <div className={styles.controls}>
                            <div className={styles.preferenceGroup}>
                                <span className={styles.prefLabel}>I eat:</span>
                                {(["veg", "non-veg", "vegan"] as const).map((p) => (
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

                            <div className={styles.sustainInline} aria-label="Sustain vs Wind Down">
                                <span className={styles.prefLabel}>Goal:</span>
                                <div className={styles.sustainButtons}>
                                    <button
                                        type="button"
                                        className={`${styles.prefBtn} ${sustainChoice === "sustain" ? styles.prefActive : ""}`}
                                        onClick={() => setSustainChoice("sustain")}
                                        disabled={loading}
                                    >
                                        Sustain
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.prefBtn} ${sustainChoice === "wind_down" ? styles.prefActive : ""}`}
                                        onClick={() => setSustainChoice("wind_down")}
                                        disabled={loading}
                                    >
                                        Wind Down
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={loading || (mode === "text" ? !text.trim() : false)}
                            >
                                {loading ? "Analyzing..." : "Analyze Mood →"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default MoodInput;
