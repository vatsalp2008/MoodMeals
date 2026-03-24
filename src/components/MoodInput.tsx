"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMood, MoodAnalysis } from "../context/MoodContext";
import styles from "./MoodInput.module.css";

const SUSTAIN_TRIGGER_EMOTIONS = new Set(["happy", "energetic"]);

// Web Speech API type guard
const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
    if (typeof window === "undefined") return null;
    return (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
        ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
        ?? null;
};

const MoodInput = () => {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { setAnalysis, analysis, preference, setPreference, sustainMode, setSustainMode } = useMood();

    // Voice input state
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const baseTextRef = useRef("");

    useEffect(() => {
        setSpeechSupported(getSpeechRecognition() !== null);
        return () => {
            recognitionRef.current?.abort();
            recognitionRef.current = null;
        };
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognitionClass = getSpeechRecognition();
        if (!SpeechRecognitionClass) return;

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;
        baseTextRef.current = text;

        let finalTranscript = "";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + " ";
                } else {
                    interim = transcript;
                }
            }
            const base = baseTextRef.current;
            const separator = base && !base.endsWith(" ") ? " " : "";
            setText((base + separator + finalTranscript + interim).trimStart());
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
        setIsListening(true);
    }, [isListening]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        setLoading(true);
        setError("");
        setAnalysis(null);
        setSustainMode(null);

        try {
            const res = await fetch("/api/analyze-mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: trimmed }),
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

    const showSustainToggle = analysis && SUSTAIN_TRIGGER_EMOTIONS.has(analysis.emotion);

    return (
        <section id="mood-log" className={styles.section}>
            <div className={`container ${styles.container}`}>
                <h2 className={styles.title}>How are you feeling today?</h2>
                <p className={styles.subtitle}>
                    Tell us what's on your mind and we'll find the perfect meal to match.
                </p>

                <div className={styles.inputWrapper}>
                    {loading && <div className={`${styles.status} ${styles.visible}`}>✨ Analyzing your mood...</div>}
                    {error && <div className={`${styles.status} ${styles.errorStatus} ${styles.visible}`}>⚠️ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.textareaWrap}>
                            <textarea
                                className={`${styles.textarea} ${speechSupported ? styles.textareaWithMic : ""}`}
                                placeholder="e.g., 'I'm super stressed from work and need something warm and comforting' or 'I'm feeling great and full of energy today!'"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                disabled={loading}
                            />
                            {speechSupported && (
                                <button
                                    type="button"
                                    className={`${styles.micBtn} ${isListening ? styles.micBtnRecording : ""}`}
                                    onClick={toggleListening}
                                    disabled={loading}
                                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                                    aria-checked={isListening}
                                    role="switch"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                </button>
                            )}
                            {isListening && <span className={styles.srOnly} aria-live="polite">Listening...</span>}
                        </div>

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

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={!text.trim() || loading}
                            >
                                {loading ? "Analyzing..." : "Analyze Mood →"}
                            </button>
                        </div>
                    </form>
                </div>

                {showSustainToggle && (
                    <div className={styles.sustainToggle}>
                        <p className={styles.sustainLabel}>
                            You're feeling {analysis.emotion}! Want to keep the energy going or ease into rest?
                        </p>
                        <div className={styles.sustainBtns}>
                            <button
                                type="button"
                                className={`${styles.sustainBtn} ${sustainMode === "sustain" ? styles.sustainActive : ""}`}
                                onClick={() => setSustainMode(sustainMode === "sustain" ? null : "sustain")}
                            >
                                🚀 Sustain
                            </button>
                            <button
                                type="button"
                                className={`${styles.sustainBtn} ${sustainMode === "winddown" ? styles.winddownActive : ""}`}
                                onClick={() => setSustainMode(sustainMode === "winddown" ? null : "winddown")}
                            >
                                😌 Wind Down
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default MoodInput;
