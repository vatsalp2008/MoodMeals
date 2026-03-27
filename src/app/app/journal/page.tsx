"use client";

import Link from "next/link";
import { useJournal } from "@/context/JournalContext";
import WellnessProgress from "@/components/WellnessProgress";
import MoodTrendChart from "@/components/MoodTrendChart";
import MoodCorrelationReport from "@/components/MoodCorrelationReport";
import styles from "./page.module.css";

const EMOTION_EMOJIS: Record<string, string> = {
    stressed: "😤", tired: "😴", anxious: "😰", happy: "😊",
    focused: "🎯", calm: "😌", sad: "😢", energetic: "⚡",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function JournalPage() {
    const { entries, clearEntries } = useJournal();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <h1 className={styles.title}>Mood Journal</h1>
                    {entries.length > 0 && (
                        <button className={styles.clearBtn} onClick={clearEntries}>Clear all</button>
                    )}
                </div>
                <p className={styles.subtitle}>
                    Your mood history — see how your emotions connect to your meals.
                </p>
            </div>

            <div style={{ padding: "0 24px", maxWidth: 720, margin: "24px auto 0" }}>
                <WellnessProgress />
            </div>

            <div style={{ padding: "0 24px", maxWidth: 720, margin: "24px auto 0" }}>
                <MoodTrendChart entries={entries} />
            </div>

            <div style={{ padding: "0 24px", maxWidth: 720, margin: "24px auto 0" }}>
                <MoodCorrelationReport entries={entries} />
            </div>

            <div className={styles.container}>
                {entries.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📓</div>
                        <p className={styles.emptyTitle}>No entries yet</p>
                        <p className={styles.emptyText}>
                            Check in on the dashboard to start tracking your mood journey.
                        </p>
                        <Link href="/app" className={styles.emptyLink}>Go to Dashboard →</Link>
                    </div>
                ) : (
                    <ul className={styles.entries}>
                        {entries.map(entry => (
                            <li key={entry.id} className={styles.entry}>
                                <div className={styles.entryEmoji}>
                                    {EMOTION_EMOJIS[entry.emotion] ?? "🧠"}
                                </div>
                                <div className={styles.entryBody}>
                                    <div className={styles.entryTop}>
                                        <span className={styles.entryEmotion}>
                                            {entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1)}
                                        </span>
                                        <span className={`${styles.entryIntensity} ${styles[entry.intensity]}`}>
                                            {entry.intensity}
                                        </span>
                                    </div>
                                    {entry.userInputText && (
                                        <p className={styles.entryUserInput}>
                                            &ldquo;{entry.userInputText}&rdquo;
                                        </p>
                                    )}
                                    <p className={styles.entryMessage}>
                                        {entry.userInputText ? (
                                            <><span className={styles.aiLabel}>AI insight:</span> {entry.message}</>
                                        ) : (
                                            <>&ldquo;{entry.message}&rdquo;</>
                                        )}
                                    </p>
                                    {entry.mealName && (
                                        <div className={styles.entryMeal}>
                                            🍽️ {entry.mealName}
                                        </div>
                                    )}
                                    <time className={styles.entryDate}>{formatDate(entry.date)}</time>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
