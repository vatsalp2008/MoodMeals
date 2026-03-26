"use client";

import { useState, useEffect } from "react";
import styles from "./Onboarding.module.css";

const STORAGE_KEY = "moodmeals_onboarding_seen";

export function OnboardingBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const seen = localStorage.getItem(STORAGE_KEY);
        if (!seen) setVisible(true);
    }, []);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, "1");
    };

    if (!visible) return null;

    return (
        <div className={styles.banner} role="status">
            <div className={styles.bannerInner}>
                <div className={styles.bannerContent}>
                    <p className={styles.bannerTitle}>Welcome to MoodMeals</p>
                    <p className={styles.bannerText}>
                        <strong>Step 1:</strong> Tell us how you're feeling.{" "}
                        <strong>Step 2:</strong> Browse mood-matched meals.{" "}
                        <strong>Step 3:</strong> Build your grocery list.
                    </p>
                </div>
                <button className={styles.bannerDismiss} onClick={dismiss} aria-label="Dismiss">
                    Got it
                </button>
            </div>
        </div>
    );
}

export function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const dismissed = sessionStorage.getItem("moodmeals_signin_prompt_dismissed");
        if (!dismissed) setVisible(true);
    }, []);

    const dismiss = () => {
        setVisible(false);
        sessionStorage.setItem("moodmeals_signin_prompt_dismissed", "1");
    };

    if (!visible) return null;

    return (
        <div className={styles.prompt}>
            <p className={styles.promptText}>
                Sign in to save your mood history and personalize allergy filters.
            </p>
            <div className={styles.promptActions}>
                <button className={styles.promptSignIn} onClick={() => { dismiss(); onSignIn(); }}>
                    Sign In
                </button>
                <button className={styles.promptLater} onClick={dismiss}>
                    Maybe later
                </button>
            </div>
        </div>
    );
}
