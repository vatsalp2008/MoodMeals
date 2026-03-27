"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMood, MoodAnalysis } from "../context/MoodContext";
import { useStressCalendar } from "../context/StressCalendarContext";
import { MicIcon } from "./Icons";
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
    const [text, setText] = useState(() => {
        try {
            if (typeof window === "undefined") return "";
            return localStorage.getItem("moodmeals_mood_input") ?? "";
        } catch { return ""; }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { setAnalysis, analysis, sustainMode, setSustainMode } = useMood();
    const { events: stressEvents } = useStressCalendar();

    // Find stress events happening within the next 24 hours
    const urgentEvents = useMemo(() => {
        const now = new Date();
        const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return stressEvents.filter((evt) => {
            const evtDate = new Date(evt.date + (evt.time ? `T${evt.time}` : "T09:00:00"));
            return evtDate > now && evtDate <= horizon;
        });
    }, [stressEvents]);

    // Voice input state
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const baseTextRef = useRef("");
    const currentTextRef = useRef(text);

    // Keep currentTextRef in sync so toggleListening always sees the latest value
    useEffect(() => {
        currentTextRef.current = text;
    }, [text]);

    useEffect(() => {
        setSpeechSupported(getSpeechRecognition() !== null);
        return () => {
            recognitionRef.current?.abort();
            recognitionRef.current = null;
        };
    }, []);

    // Persist mood input text to localStorage
    useEffect(() => {
        try { localStorage.setItem("moodmeals_mood_input", text); } catch { /* ignore */ }
    }, [text]);

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
        baseTextRef.current = currentTextRef.current;

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
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
        const trimmed = text.trim();
        if (!trimmed) return;

        setLoading(true);
        setError("");
        setAnalysis(null);
        setSustainMode(null);

        // Append upcoming stress event context so the AI factors it in
        let moodWithContext = trimmed;
        if (urgentEvents.length > 0) {
            const eventDescriptions = urgentEvents.map((evt) => {
                const evtDate = new Date(evt.date + (evt.time ? `T${evt.time}` : "T09:00:00"));
                const hoursUntil = Math.round((evtDate.getTime() - Date.now()) / (1000 * 60 * 60));
                const timeLabel = hoursUntil <= 1 ? "in less than 1 hour" : `in about ${hoursUntil} hours`;
                return `${evt.type} "${evt.title}" ${timeLabel}`;
            });
            moodWithContext += ` [Context: User has upcoming events - ${eventDescriptions.join("; ")}]`;
        }

        try {
            const res = await fetch("/api/analyze-mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: moodWithContext }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Analysis failed.");
            }

            const data: MoodAnalysis = await res.json();
            setAnalysis(data);
            setText("");
            localStorage.removeItem("moodmeals_mood_input");

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
                        <textarea
                            className={styles.textarea}
                            placeholder="e.g., 'I'm super stressed from work and need something warm and comforting' or 'I'm feeling great and full of energy today!'"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={loading}
                        />
                        {isListening && <span className={styles.srOnly} aria-live="polite">Listening...</span>}

                        <div className={styles.controls}>
                            <div className={styles.preferenceGroup}>
                                {speechSupported && (
                                    <button
                                        type="button"
                                        className={`${styles.micBtn} ${isListening ? styles.micBtnRecording : ""}`}
                                        onClick={toggleListening}
                                        disabled={loading}
                                        aria-label={isListening ? "Stop voice input" : "Start voice input"}
                                        aria-checked={isListening}
                                        role="switch"
                                        title={isListening ? "Stop listening" : "Tap to speak your mood"}
                                    >
                                        <MicIcon size={18} />
                                    </button>
                                )}
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
