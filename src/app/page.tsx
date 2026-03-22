import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import MealLibrary from "@/components/MealLibrary";
import TheScience from "@/components/TheScience";
import MoodInput from "@/components/MoodInput";
import PantryBudgetPanel from "@/components/PantryBudgetPanel";
import CTASection from "@/components/CTASection";
import { MoodProvider } from "@/context/MoodContext";
import Link from "next/link";
import LocalOnboarding from "@/components/LocalOnboarding";

export default function Home() {
  return (
    <MoodProvider>
      <main>
        <Navbar />
        <Hero />
        <LocalOnboarding />
        <MoodInput />
        <PantryBudgetPanel />
        <HowItWorks />
        <TheScience />
        <MealLibrary />

        {/* Testimonial */}
        <section style={{ padding: "100px 0", backgroundColor: "var(--warm-white)", textAlign: "center" }}>
          <div className="container">
            <div style={{ fontSize: "1.1rem", fontStyle: "italic", color: "var(--text-mid)", maxWidth: "800px", margin: "0 auto", lineHeight: "1.75" }}>
              The combination of mood tracking and personalized meal plans has completely transformed my approach to nutrition. I feel more in sync with my body than ever before.
            </div>
            <div style={{ marginTop: "24px", fontWeight: 700, color: "var(--text-dark)" }}>— Elena S., Holistic Health Coach</div>
          </div>
        </section>

        <CTASection />

        {/* Footer */}
        <footer style={{ padding: "80px 0 40px", backgroundColor: "var(--cream)", borderTop: "1px solid var(--beige-dark)", textAlign: "center" }}>
          <div className="container">
            <Link href="/" style={{ fontFamily: "var(--font-lora), serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--sage)", marginBottom: "20px", display: "inline-block" }}>
              🥗 MoodMeals
            </Link>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto 40px" }}>
              The world&apos;s first emotion-aware nutrition platform. Fuel your body according to your mind.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "40px" }}>
              <Link href="#how" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-mid)" }}>How it Works</Link>
              <Link href="#science" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-mid)" }}>Science</Link>
              <Link href="#recipes" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-mid)" }}>Recipes</Link>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
              © {new Date().getFullYear()} MoodMeals Inc. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </MoodProvider>
  );
}
