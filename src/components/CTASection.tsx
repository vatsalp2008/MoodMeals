import React from "react";
import Link from "next/link";
import styles from "./CTASection.module.css";

const CTASection = () => {
    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.title}>Built for Northeastern Seattle students.</h2>
                <p className={styles.text}>
                    Free. No tracking. Just science-backed meals matched to how you feel.
                </p>
                <Link href="/app" className={styles.btn}>
                    Get Started for Free
                </Link>
            </div>
        </section>
    );
};

export default CTASection;
