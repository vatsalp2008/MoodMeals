"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./Icons";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
    const [dark, setDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("moodmeals-theme");
        const prefersDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
        setDark(prefersDark);
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
        setMounted(true);
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
        localStorage.setItem("moodmeals-theme", next ? "dark" : "light");
    };

    // Avoid hydration mismatch — render nothing until client-side
    if (!mounted) return <div className={styles.toggle} style={{ width: 36, height: 36 }} />;

    return (
        <button
            className={styles.toggle}
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
        >
            {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
    );
}
