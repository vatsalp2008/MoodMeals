import React from "react";
import styles from "./HowItWorks.module.css";

const STEPS = [
    {
        icon: "\u{1F9E0}",
        step: "01",
        title: "Share Your Mood",
        desc: "Type or speak how you\u2019re feeling. Our AI analyzes your emotional state and maps it to specific nutrient needs.",
    },
    {
        icon: "\u{1F96A}",
        step: "02",
        title: "Get Matched Meals",
        desc: "Receive personalized meal recommendations backed by nutritional psychiatry research. Each meal explains WHY it helps your mood.",
    },
    {
        icon: "\u{1F4CB}",
        step: "03",
        title: "Plan & Shop",
        desc: "Add meals to your calendar, build a grocery list with Seattle budget tips, and track your mood-food patterns over time.",
    },
];

const HowItWorks = () => {
    return (
        <section id="how" className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.label}>HOW IT WORKS</span>
                    <h2 className={styles.title}>Three steps to feeling better.</h2>
                    <p className={styles.subTitle}>
                        From a quick mood check-in to science-backed meals on your plate
                        — MoodMeals makes it effortless.
                    </p>
                </div>

                <div className={styles.grid}>
                    {STEPS.map(step => (
                        <div key={step.step} className={styles.card}>
                            <div className={styles.icon}>{step.icon}</div>
                            <span className={styles.stepNum}>Step {step.step}</span>
                            <h3 className={styles.cardTitle}>{step.title}</h3>
                            <p className={styles.cardDesc}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
