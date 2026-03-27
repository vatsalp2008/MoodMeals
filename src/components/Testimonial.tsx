import React from "react";
import styles from "./Testimonial.module.css";

const Testimonial = () => {
    return (
        <section className={styles.section}>
            <div className="container">
                <div className={styles.card}>
                    <span className={styles.quote}>&ldquo;</span>
                    <blockquote className={styles.text}>
                        During finals week, MoodMeals suggested magnesium-rich meals when I
                        was stressed. I actually felt calmer and more focused.
                    </blockquote>
                    <p className={styles.author}>
                        — Alex, MS CS @ Northeastern
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Testimonial;
