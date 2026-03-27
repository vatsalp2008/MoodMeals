"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { useMood } from "@/context/MoodContext";
import { useJournal } from "@/context/JournalContext";
import { useGroceryOptional } from "@/context/GroceryContext";
import { useUserOptional } from "@/context/UserContext";
import MoodInput from "@/components/MoodInput";
import MealLibrary from "@/components/MealLibrary";
import { OnboardingBanner, SignInPrompt } from "@/components/Onboarding";
import StressInterventionBanner from "@/components/StressInterventionBanner";
import EventInput from "@/components/EventInput";
import ReflectionPrompt from "@/components/ReflectionPrompt";
import styles from "./page.module.css";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
}

function FlowStepper({ step }: { step: 1 | 2 | 3 }) {
    return (
        <div className={styles.stepper} aria-label="Progress">
            <StepNode
                num={1}
                label="Check In"
                state={step > 1 ? "done" : step === 1 ? "active" : "inactive"}
                href="#mood-input"
            />
            <div className={`${styles.stepLine} ${step > 1 ? styles.stepLineDone : ""}`} />
            <StepNode
                num={2}
                label="Pick Meals"
                state={step > 2 ? "done" : step === 2 ? "active" : "inactive"}
                href="#recipes"
            />
            <div className={`${styles.stepLine} ${step > 2 ? styles.stepLineDone : ""}`} />
            <StepNode
                num={3}
                label="Grocery List"
                state={step === 3 ? "active" : "inactive"}
                href="/app/grocery"
                isLink
            />
        </div>
    );
}

function StepNode({
    num, label, state, href, isLink,
}: {
    num: number;
    label: string;
    state: "active" | "done" | "inactive";
    href: string;
    isLink?: boolean;
}) {
    const circle = (
        <span
            className={`${styles.stepCircle} ${
                state === "active" ? styles.stepCircleActive :
                state === "done" ? styles.stepCircleDone :
                styles.stepCircleInactive
            }`}
        >
            {state === "done" ? "✓" : num}
        </span>
    );

    const label_ = <span className={`${styles.stepLabel} ${state === "inactive" ? styles.stepLabelInactive : ""}`}>{label}</span>;

    const inner = (
        <div className={styles.stepNode}>
            {circle}
            {label_}
        </div>
    );

    if (isLink && state !== "inactive") {
        return <Link href={href} className={styles.stepNodeLink}>{inner}</Link>;
    }
    if (!isLink && href.startsWith("#")) {
        return (
            <a href={href} className={styles.stepNodeLink}>
                {inner}
            </a>
        );
    }
    return <div>{inner}</div>;
}

export default function AppDashboard() {
    const { analysis } = useMood();
    const { addEntry } = useJournal();
    const grocery = useGroceryOptional();
    const userCtx = useUserOptional();
    const lastSavedKeyRef = useRef<string | null>(null);

    const groceryCount = grocery?.selectedMeals.length ?? 0;
    const user = userCtx?.user ?? null;
    const firstName = user?.name.split(" ")[0] ?? null;

    const isGentleMode = analysis?.clinicalState === "high-stress" || analysis?.clinicalState === "depressive";
    const currentStep: 1 | 2 | 3 = !analysis ? 1 : groceryCount > 0 ? 3 : 2;

    // Ref-based dedup prevents re-saving when analysis object reference changes but content is the same
    useEffect(() => {
        if (analysis) {
            const key = `${analysis.emotion}::${analysis.message.slice(0, 30)}`;
            if (key !== lastSavedKeyRef.current) {
                lastSavedKeyRef.current = key;
                addEntry({
                    emotion: analysis.emotion,
                    intensity: analysis.intensity,
                    message: analysis.message,
                    userInputText: analysis.userInputText,
                });
            }
        }
    }, [analysis, addEntry]);

    const isLoggedIn = !!user;

    return (
        <div className={`${styles.page} ${isGentleMode ? styles.gentleMode : ""}`}>
            {/* First-run onboarding */}
            <OnboardingBanner />

            {/* Flow stepper — hidden in gentle mode to reduce cognitive pressure */}
            {!isGentleMode && (
                <div className={styles.stepperWrap}>
                    <FlowStepper step={currentStep} />
                </div>
            )}

            {/* Sign-in prompt — shown after mood analysis if not logged in */}
            {analysis && !isLoggedIn && (
                <SignInPrompt onSignIn={() => {
                    document.querySelector<HTMLButtonElement>("[class*='signInBtn']")?.click();
                }} />
            )}

            {/* Stress intervention & deadlines — hidden in gentle mode */}
            {!isGentleMode && (
                <>
                    <StressInterventionBanner />
                    <EventInput />
                </>
            )}

            {/* Calming banner — gentle mode only */}
            {isGentleMode && (
                <div className={styles.gentleCalm}>
                    <span className={styles.gentleCalmIcon}>🌿</span>
                    <p className={styles.gentleCalmText}>
                        We&apos;re here for you. Here are a few simple, nourishing options.
                    </p>
                </div>
            )}

            {/* Greeting banner */}
            <div className={styles.greeting} id="mood-input">
                <p className={styles.greetingLine}>
                    {isGentleMode
                        ? <>{getGreeting()}{firstName ? `, ${firstName}` : ""}</>
                        : <>{getGreeting()}{firstName ? `, ${firstName}` : ""} 👋</>
                    }
                </p>
                <p className={styles.greetingSubtext}>
                    {isGentleMode
                        ? <><span className={styles.breathingDot} />Take it easy. We&apos;ve got a few calming meals ready for you.</>
                        : analysis
                        ? `You're feeling ${analysis.emotion}. Here are your personalized picks.`
                        : "Tell us your mood and we'll find the perfect meal for you."}
                </p>
            </div>

            {/* Breathe micro-interaction — gentle mode only */}
            {isGentleMode && (
                <div className={styles.breatheWrap}>
                    <div className={styles.breatheCircle} aria-hidden="true" />
                    <div className={styles.breatheText} aria-label="Breathing exercise: breathe in and out slowly">
                        <span className={styles.breatheTextIn}>Breathe in...</span>
                        <span className={styles.breatheTextOut}>Breathe out...</span>
                    </div>
                </div>
            )}

            {/* Mood check-in */}
            <div className={styles.checkinWrap}>
                <MoodInput />
            </div>

            {/* Step 2 contextual CTA banner — hidden in gentle mode */}
            {!isGentleMode && analysis && groceryCount === 0 && (
                <div className={styles.ctaBanner}>
                    <span className={styles.ctaBannerStep}>Step 2</span>
                    <span>Pick your meals and add them to your grocery list</span>
                </div>
            )}

            {/* Empty state — only shown when no analysis yet */}
            {!analysis && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyEmoji}>🍽️</div>
                    <p className={styles.emptyHeading}>No recommendations yet</p>
                    <p className={styles.emptyText}>
                        Share how you&apos;re feeling above and we&apos;ll suggest meals that support your mood.
                    </p>
                </div>
            )}

            {/* Meal grid */}
            <MealLibrary gentleMode={isGentleMode} />

            {/* Floating grocery bar — visible after meals are added */}
            {groceryCount > 0 && (
                <Link href="/app/grocery" className={styles.floatingGroceryBar}>
                    <span>🛒 {groceryCount} meal{groceryCount !== 1 ? "s" : ""} selected</span>
                    <span className={styles.floatingBarArrow}>View Grocery List →</span>
                </Link>
            )}

            {/* Post-meal reflection prompt */}
            <ReflectionPrompt />
        </div>
    );
}
