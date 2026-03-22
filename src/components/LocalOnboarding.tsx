"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMood, MoodAnalysis } from "../context/MoodContext";
import styles from "./LocalOnboarding.module.css";
import { MealPreference } from "../types";

type PreSignupPayload = {
    version: 1;
    preference: MealPreference;
    pantryItems: string[];
    budget: number;
    analysis: MoodAnalysis | null;
};

const PRE_KEY = "moodMeals_preSignup_v1";
const SIGNED_KEY = "moodMeals_signedIn_v1";
const SIGNED_FLAG = "moodMeals_signedUp_v1";

const defaultPayload = (): PreSignupPayload => ({
    version: 1,
    preference: "veg",
    pantryItems: [],
    budget: 40,
    analysis: null,
});

const LocalOnboarding = () => {
    const {
        analysis,
        setAnalysis,
        preference,
        setPreference,
        pantryItems,
        setPantryItems,
        budget,
        setBudget,
    } = useMood();

    const [signedUp, setSignedUp] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const hasPromptedOnceRef = useRef(false);

    useEffect(() => {
        // Hydrate from localStorage on first load.
        const storedSigned = localStorage.getItem(SIGNED_FLAG) === "true";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSignedUp(storedSigned);

        const parsed = (() => {
            if (storedSigned) {
                const rawSigned = localStorage.getItem(SIGNED_KEY);
                if (!rawSigned) return null;
                try {
                    return JSON.parse(rawSigned) as PreSignupPayload;
                } catch {
                    return null;
                }
            }

            const rawPre = localStorage.getItem(PRE_KEY);
            if (!rawPre) return null;
            try {
                return JSON.parse(rawPre) as PreSignupPayload;
            } catch {
                return null;
            }
        })();

        if (!parsed) return;

        setPreference(parsed.preference);
        setPantryItems(parsed.pantryItems);
        setBudget(parsed.budget);
        setAnalysis(parsed.analysis);
    }, [setAnalysis, setBudget, setPantryItems, setPreference]);

    const prePayload: PreSignupPayload = useMemo(
        () => ({
            version: 1,
            preference,
            pantryItems,
            budget,
            analysis,
        }),
        [analysis, budget, pantryItems, preference]
    );

    useEffect(() => {
        if (signedUp) return;
        // Persist pre-signup data so users can complete one recommendation cycle before "signing up".
        localStorage.setItem(PRE_KEY, JSON.stringify(prePayload));
    }, [analysis, budget, pantryItems, preference, prePayload, signedUp]);

    useEffect(() => {
        // Once the user has completed at least one recommendation cycle (analysis computed),
        // show the value-before-friction prompt (once).
        if (signedUp) return;
        if (!analysis) return;
        if (hasPromptedOnceRef.current) return;

        hasPromptedOnceRef.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowPrompt(true);
    }, [analysis, signedUp]);

    const handleSimulatedSignup = () => {
        const currentPayload = prePayload ?? defaultPayload();
        localStorage.setItem(SIGNED_KEY, JSON.stringify(currentPayload));
        localStorage.setItem(SIGNED_FLAG, "true");
        localStorage.removeItem(PRE_KEY);
        setSignedUp(true);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Sign up prompt">
            <div className={styles.modal}>
                <div className={styles.title}>Save your mood sync</div>
                <div className={styles.subtitle}>
                    You’ve completed your first recommendation. Create an account to keep your preferences and mood history.
                    (Simulated locally.)
                </div>

                <div className={styles.actions}>
                    <button className={styles.primary} type="button" onClick={handleSimulatedSignup}>
                        Create account
                    </button>
                    <button className={styles.secondary} type="button" onClick={handleDismiss}>
                        Not now
                    </button>
                </div>

                <div className={styles.finePrint}>
                    Data migration is “silent”: your pre-signup choices are copied into a signed-in localStorage key without losing anything.
                </div>
            </div>
        </div>
    );
};

export default LocalOnboarding;

