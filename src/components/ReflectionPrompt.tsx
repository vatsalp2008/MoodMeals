"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useReflection } from "../context/ReflectionContext";
import { useJournal } from "../context/JournalContext";
import styles from "./ReflectionPrompt.module.css";

interface MoodOption {
    emoji: string;
    label: string;
    value: string;
}

const MOOD_OPTIONS: MoodOption[] = [
    { emoji: "\uD83D\uDE0A", label: "Great", value: "great" },
    { emoji: "\uD83D\uDE0C", label: "Good", value: "good" },
    { emoji: "\uD83D\uDE10", label: "Okay", value: "okay" },
    { emoji: "\uD83D\uDE14", label: "Not great", value: "not_great" },
    { emoji: "\uD83D\uDE22", label: "Worse", value: "worse" },
];

const ReflectionPrompt = () => {
    const { getReadyReflection, removePendingReflection } = useReflection();
    const { updateEntry } = useJournal();

    const [activeReflection, setActiveReflection] = useState<{
        mealId: string;
        mealName: string;
        journalEntryId: string;
    } | null>(null);

    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Check for ready reflections on mount and periodically
    useEffect(() => {
        const check = () => {
            const ready = getReadyReflection();
            if (ready && !activeReflection && !showSuccess) {
                setActiveReflection({
                    mealId: ready.mealId,
                    mealName: ready.mealName,
                    journalEntryId: ready.journalEntryId,
                });
            }
        };

        check();
        const interval = setInterval(check, 60_000); // Re-check every minute
        return () => clearInterval(interval);
    }, [getReadyReflection, activeReflection, showSuccess]);

    // Trap focus inside the sheet for accessibility
    useEffect(() => {
        if (!activeReflection) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleSkip();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    });

    const handleSubmit = useCallback(() => {
        if (!activeReflection || !selectedMood) return;

        // Determine intensity from the mood choice
        const intensityMap: Record<string, "low" | "medium" | "high"> = {
            great: "high",
            good: "high",
            okay: "medium",
            not_great: "low",
            worse: "low",
        };

        updateEntry(activeReflection.journalEntryId, {
            reflectionEmotion: selectedMood,
            reflectionIntensity: intensityMap[selectedMood] ?? "medium",
            reflectionNote: note.trim() || undefined,
            reflectedAt: new Date().toISOString(),
        });

        removePendingReflection(activeReflection.mealId);
        setShowSuccess(true);

        // Auto-dismiss success after 2 seconds
        setTimeout(() => {
            setShowSuccess(false);
            setActiveReflection(null);
            setSelectedMood(null);
            setNote("");
        }, 2000);
    }, [activeReflection, selectedMood, note, updateEntry, removePendingReflection]);

    const handleSkip = useCallback(() => {
        if (!activeReflection) return;
        removePendingReflection(activeReflection.mealId);
        setActiveReflection(null);
        setSelectedMood(null);
        setNote("");
    }, [activeReflection, removePendingReflection]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                handleSkip();
            }
        },
        [handleSkip]
    );

    if (!activeReflection && !showSuccess) return null;

    return (
        <div
            className={styles.backdrop}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label={
                showSuccess
                    ? "Reflection saved"
                    : `Post-meal reflection for ${activeReflection?.mealName}`
            }
        >
            <div className={styles.sheet} ref={sheetRef}>
                <div className={styles.handle} />

                {showSuccess ? (
                    <div className={styles.successMsg}>
                        <span className={styles.successEmoji}>{"\u2728"}</span>
                        <p className={styles.successText}>Thanks for reflecting!</p>
                        <p className={styles.successSub}>
                            Your feedback helps us personalize your meals.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <span className={styles.headerEmoji}>{"\uD83C\uDF7D\uFE0F"}</span>
                            <h2 className={styles.headerTitle}>
                                How did {activeReflection?.mealName} make you feel?
                            </h2>
                            <p className={styles.headerSub}>
                                Reflect on how this meal affected your mood
                            </p>
                        </div>

                        <div className={styles.moodSelector} role="radiogroup" aria-label="Select how you feel after eating">
                            {MOOD_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`${styles.moodBtn} ${
                                        selectedMood === option.value ? styles.moodBtnActive : ""
                                    }`}
                                    onClick={() => setSelectedMood(option.value)}
                                    role="radio"
                                    aria-checked={selectedMood === option.value}
                                    aria-label={`${option.label}`}
                                >
                                    <span className={styles.moodEmoji}>{option.emoji}</span>
                                    <span className={styles.moodLabel}>{option.label}</span>
                                </button>
                            ))}
                        </div>

                        <textarea
                            className={styles.notesArea}
                            placeholder="Any thoughts? (optional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            aria-label="Reflection notes"
                            rows={3}
                        />

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={handleSubmit}
                                disabled={!selectedMood}
                            >
                                Save Reflection
                            </button>
                            <button
                                type="button"
                                className={styles.skipBtn}
                                onClick={handleSkip}
                            >
                                Skip for now
                            </button>
                        </div>

                        <p className={styles.microcopy}>
                            Your feedback helps us learn what works best for your mood
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReflectionPrompt;
