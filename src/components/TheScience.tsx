import React from "react";
import styles from "./TheScience.module.css";
import GlossaryTerm from "./GlossaryTerm";

const TheScience = () => {
    return (
        <section id="science" className="container">
            <div className={styles.section}>
                <div className={styles.content}>
                    <span className={styles.label}>SCIENCE-BACKED</span>
                    <h2 className={styles.title}>The link <br />between mind <br />and plate.</h2>
                    <p className={styles.text}>
                        MoodMeals is grounded in nutritional psychiatry research. The
                        SMILES trial (Jacka et al., 2017) demonstrated that dietary
                        improvements significantly reduced depression symptoms. Opie et al.
                        (2015) mapped specific nutrients to mood regulation pathways.
                    </p>

                    <ul className={styles.list}>
                        <li className={styles.item}>
                            <div className={styles.icon}>🌡️</div>
                            <div>
                                <h4 className={styles.itemTitle}>Stress Modulation</h4>
                                <p className={styles.itemDesc}>Using <GlossaryTerm term="Magnesium">magnesium</GlossaryTerm>-rich profiles to lower cortisol levels during high-stress periods.</p>
                            </div>
                        </li>
                        <li className={styles.item}>
                            <div className={styles.icon}>⚡</div>
                            <div>
                                <h4 className={styles.itemTitle}>Cognitive Boost</h4>
                                <p className={styles.itemDesc}>Leveraging <GlossaryTerm term="DHA">DHA</GlossaryTerm> and omega-3s for sustained mental focus and clarity.</p>
                            </div>
                        </li>
                        <li className={styles.item}>
                            <div className={styles.icon}>💤</div>
                            <div>
                                <h4 className={styles.itemTitle}>Mood Stabilization</h4>
                                <p className={styles.itemDesc}><GlossaryTerm term="Tryptophan">Tryptophan</GlossaryTerm>-based recommendations for better <GlossaryTerm term="Serotonin">serotonin</GlossaryTerm> synthesis and sleep.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className={styles.visual}>
                    {/* Decorative visual element */}
                    <div style={{ position: "absolute", inset: "-40px", overflow: "hidden", pointerEvents: "none" }}>
                        <div style={{ position: "absolute", top: "10%", left: "15%", width: "80px", height: "80px", background: "var(--sage-light)", borderRadius: "50%", opacity: 0.1, filter: "blur(20px)" }}></div>
                        <div style={{ position: "absolute", bottom: "20%", right: "10%", width: "120px", height: "120px", background: "var(--coral-light)", borderRadius: "50%", opacity: 0.1, filter: "blur(30px)" }}></div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TheScience;
