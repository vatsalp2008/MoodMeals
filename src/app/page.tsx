import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import TheScience from "@/components/TheScience";
import Testimonial from "@/components/Testimonial";
import LandingMoodDemo from "@/components/LandingMoodDemo";
import CTASection from "@/components/CTASection";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
    return (
        <main>
            <Navbar />
            <Hero />
            <HowItWorks />
            <TheScience />
            <Testimonial />
            <LandingMoodDemo />
            <CTASection />

            <footer className={styles.footer}>
                <div className="container">
                    <Link href="/" className={styles.footerLogo}>
                        🥗 MoodMeals
                    </Link>
                    <p className={styles.footerTagline}>
                        Emotion-aware meal planning for college students.<br />
                        Built on nutritional psychiatry research. Seattle-optimized budgets.
                    </p>
                    <div className={styles.footerLinks}>
                        <Link href="#how">How it Works</Link>
                        <Link href="#science">Features</Link>
                        <Link href="#try">Try It</Link>
                        <Link href="/app">Open App</Link>
                    </div>
                    <p className={styles.footerCopy}>
                        © {new Date().getFullYear()} MoodMeals Inc. All rights reserved.
                    </p>
                </div>
            </footer>
        </main>
    );
}
