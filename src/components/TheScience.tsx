import React from "react";
import styles from "./TheScience.module.css";

const FEATURES = [
    {
        icon: "\u{1F9EC}",
        title: "Nutritional Psychiatry",
        desc: "Maps 5 clinical mood states to targeted nutrients based on the SMILES trial and Opie et al. research.",
    },
    {
        icon: "\u{1F4C5}",
        title: "Smart Calendar",
        desc: "Predicts stress from your schedule and suggests meals before deadlines hit.",
    },
    {
        icon: "\u{1F4B0}",
        title: "Seattle Student Budget",
        desc: "QFC Wednesday deals, 99 Ranch bulk prices, Pike Place markdowns — eating well on a student budget.",
    },
    {
        icon: "\u{1F4CA}",
        title: "Mood Tracking",
        desc: "Journal entries, mood-food correlation reports, and wellness progress over time.",
    },
    {
        icon: "\u{1F512}",
        title: "Google Auth",
        desc: "Sync your calendar, save your data across devices with secure Google sign-in.",
    },
    {
        icon: "\u26A1",
        title: "Quick Meals for Burnout",
        desc: "Auto-filters easy recipes when you are exhausted — no 30-step dinners on a bad day.",
    },
];

const TheScience = () => {
    return (
        <section id="science" className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.label}>FEATURES</span>
                    <h2 className={styles.title}>
                        Everything a student needs <br />to eat smarter.
                    </h2>
                    <p className={styles.subtitle}>
                        Built on nutritional psychiatry research and optimized for
                        Northeastern Seattle students.
                    </p>
                </div>

                <div className={styles.grid}>
                    {FEATURES.map(f => (
                        <div key={f.title} className={styles.card}>
                            <div className={styles.icon}>{f.icon}</div>
                            <h3 className={styles.cardTitle}>{f.title}</h3>
                            <p className={styles.cardDesc}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TheScience;
