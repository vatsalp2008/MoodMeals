import React from "react";
import styles from "./HowItWorks.module.css";
import GlossaryTerm from "./GlossaryTerm";

const HowItWorks = () => {
    return (
        <section id="how" className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.label}>HOW IT WORKS</span>
                    <h2 className={styles.title}>The Mood-Sync experience.</h2>
                    <p className={styles.subTitle}>
                        From emotion logging to high-performance nutrition, our AI-driven
                        platform ensures every bite serves your well-being.
                    </p>
                </div>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <div className={styles.icon}>🧠</div>
                        <h3 className={styles.cardTitle}>Mind Log</h3>
                        <p className={styles.cardDesc}>
                            Log your current state via voice, text, or wearable heart rate variability (HRV) data.
                        </p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.icon}>🥗</div>
                        <h3 className={styles.cardTitle}>AI Nu-Sync</h3>
                        <p className={styles.cardDesc}>
                            Our AI maps your emotions to nutritional profiles (e.g., <GlossaryTerm term="Magnesium">magnesium</GlossaryTerm> for stress, omega-3 for focus).
                        </p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.icon}>🍴</div>
                        <h3 className={styles.cardTitle}>Eat Better</h3>
                        <p className={styles.cardDesc}>
                            Receive a curated list of meals—personalized for your dietary preferences (Veg, Non-Veg, Vegan).
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
