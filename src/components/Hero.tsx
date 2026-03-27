"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";

const MOOD_WORDS = ["stressed", "tired", "anxious", "happy", "focused", "calm", "energetic"] as const;

const FEATURE_PILLS = [
    { emoji: "\u{1F9E0}", label: "AI Mood Analysis" },
    { emoji: "\u{1F4C5}", label: "Calendar Sync" },
    { emoji: "\u{1F4B0}", label: "Seattle Budget Tips" },
    { emoji: "\u{1F52C}", label: "Nutritional Science" },
];

const Hero = () => {
    const [wordIdx, setWordIdx] = useState(0);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setWordIdx(i => (i + 1) % MOOD_WORDS.length);
                setFading(false);
            }, 320);
        }, 2600);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className={styles.hero}>
            <div className="container">
                <div className={styles.inner}>
                    <div className={styles.content}>
                        <div className={styles.badge}>
                            <span className={styles.dot} />
                            POWERED BY NUTRITIONAL PSYCHIATRY
                        </div>

                        <h1 className={styles.headline}>
                            Your mood drives <br />
                            your meals. <br />
                            Your meals drive <br />
                            <em>your grades.</em>
                        </h1>

                        <div className={styles.moodWordWrap}>
                            <span className={styles.moodWordLabel}>When you&apos;re feeling</span>
                            <span
                                className={`${styles.moodWord} ${fading ? styles.moodWordFade : ""}`}
                            >
                                {MOOD_WORDS[wordIdx]}
                            </span>
                            <span className={styles.moodWordLabel}>— we know what to eat.</span>
                        </div>

                        <p className={styles.copy}>
                            AI-powered mood analysis meets nutritional psychiatry. MoodMeals
                            predicts stress from your calendar, matches meals to your emotional
                            state, and keeps it all on a Seattle student budget.
                        </p>

                        <div className={styles.featurePills}>
                            {FEATURE_PILLS.map(pill => (
                                <span key={pill.label} className={styles.featurePill}>
                                    <span className={styles.featurePillEmoji}>{pill.emoji}</span>
                                    {pill.label}
                                </span>
                            ))}
                        </div>

                        <div className={styles.actions}>
                            <Link href="#try" className={styles.btnPrimary}>
                                Try It Now
                            </Link>
                            <Link href="/app" className={styles.btnSecondary}>
                                Open App →
                            </Link>
                        </div>
                    </div>

                    <div className={styles.visual}>
                        <div className={styles.imgWrap}>
                            <Image
                                src="/hero.png"
                                alt="Healthy grain bowl"
                                width={480}
                                height={600}
                                priority
                            />
                        </div>

                        <div className={`${styles.chip} ${styles.chipOne}`}>
                            <span>{"\u{1F60C}"}</span> Relaxed
                        </div>
                        <div className={`${styles.chip} ${styles.chipTwo}`}>
                            <span>{"\u{1F680}"}</span> Focused
                        </div>
                        <div className={`${styles.chip} ${styles.chipThree}`}>
                            <span>{"\u26A1"}</span> Energized
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
