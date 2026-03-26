"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";

const MOOD_WORDS = ["stressed", "tired", "anxious", "happy", "focused", "calm", "energetic"] as const;

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
                            Stress-eat <br />
                            <em>smarter.</em>
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
                            MoodMeals maps your emotional state to clinically-backed nutrients
                            (Jacka et al., 2017; Opie et al., 2015). Meals matched to your mood,
                            on a student budget.
                        </p>

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
                            <span>😌</span> Relaxed
                        </div>
                        <div className={`${styles.chip} ${styles.chipTwo}`}>
                            <span>🚀</span> Focused
                        </div>
                        <div className={`${styles.chip} ${styles.chipThree}`}>
                            <span>⚡</span> Energized
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
