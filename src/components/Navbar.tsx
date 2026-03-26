"use client";

import React, { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import styles from "./Navbar.module.css";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const toggleMenu = () => setIsMenuOpen(o => !o);

    return (
        <>
            <nav className={styles.navbar}>
                <div className={styles.inner}>
                    <Link href="/" className={styles.logo}>
                        <span>🥗</span> MoodMeals
                    </Link>

                    <div className={styles.links}>
                        <Link href="#how" className={styles.link}>How it Works</Link>
                        <Link href="#science" className={styles.link}>Science</Link>
                        <Link href="#try" className={styles.link}>Try It</Link>
                    </div>

                    <ThemeToggle />
                    <Link href="/app" className={styles.openApp}>Open App →</Link>

                    <button
                        className={styles.hamburger}
                        onClick={toggleMenu}
                        aria-label="Toggle navigation"
                        aria-expanded={isMenuOpen}
                    >
                        <span style={{ transform: isMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
                        <span style={{ opacity: isMenuOpen ? 0 : 1 }} />
                        <span style={{ transform: isMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
                    </button>
                </div>
            </nav>

            {/* Mobile menu */}
            <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.active : ""}`}>
                <Link href="#how" className={styles.link} onClick={toggleMenu}>How it Works</Link>
                <Link href="#science" className={styles.link} onClick={toggleMenu}>Science</Link>
                <Link href="#try" className={styles.link} onClick={toggleMenu}>Try It</Link>
                <Link href="/app" className={styles.mobileOpenApp} onClick={toggleMenu}>Open App →</Link>
            </div>
        </>
    );
};

export default Navbar;
