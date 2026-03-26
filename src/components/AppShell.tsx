"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoodProvider } from "@/context/MoodContext";
import { PantryProvider } from "@/context/PantryContext";
import { GroceryProvider } from "@/context/GroceryContext";
import { JournalProvider } from "@/context/JournalContext";
import { UserProvider, useUser } from "@/context/UserContext";
import { AllergyType } from "@/types";
import BottomNav from "./BottomNav";
import { XIcon, ArrowLeftIcon } from "./Icons";
import ThemeToggle from "./ThemeToggle";
import styles from "./AppShell.module.css";

const NAV_LINKS = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/pantry", label: "Pantry" },
    { href: "/app/grocery", label: "Grocery" },
    { href: "/app/journal", label: "Journal" },
];

const ALLERGY_OPTIONS: { value: AllergyType; label: string }[] = [
    { value: "gluten", label: "Gluten" },
    { value: "dairy", label: "Dairy" },
    { value: "nuts", label: "Nuts" },
    { value: "shellfish", label: "Shellfish" },
    { value: "soy", label: "Soy" },
    { value: "fish", label: "Fish" },
    { value: "eggs", label: "Eggs" },
    { value: "sesame", label: "Sesame" },
];

function AllergyChipSelector({
    selected,
    onToggle,
}: {
    selected: AllergyType[];
    onToggle: (allergy: AllergyType) => void;
}) {
    return (
        <div className={styles.allergySection}>
            <span className={styles.allergySectionLabel}>Allergies / Intolerances</span>
            <div className={styles.allergyChips}>
                {ALLERGY_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        className={`${styles.allergyChip} ${selected.includes(opt.value) ? styles.allergyChipActive : ""}`}
                        onClick={() => onToggle(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function UserArea() {
    const { user, isLoggedIn, login, logout, updateAllergies } = useUser();
    const [showSignIn, setShowSignIn] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedAllergies, setSelectedAllergies] = useState<AllergyType[]>([]);
    const [showManageAllergies, setShowManageAllergies] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setShowManageAllergies(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const toggleAllergy = (allergy: AllergyType) => {
        setSelectedAllergies(prev =>
            prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
        );
    };

    const toggleDropdownAllergy = (allergy: AllergyType) => {
        if (!user) return;
        const current = user.allergies ?? [];
        const updated = current.includes(allergy)
            ? current.filter(a => a !== allergy)
            : [...current, allergy];
        updateAllergies(updated);
    };

    const handleLogin = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        login(trimmed, email.trim(), selectedAllergies);
        setShowSignIn(false);
        setName("");
        setEmail("");
        setSelectedAllergies([]);
    };

    if (isLoggedIn && user) {
        return (
            <div className={styles.userArea} ref={dropdownRef}>
                <button
                    className={styles.avatar}
                    style={{ background: user.avatarColor }}
                    onClick={() => setShowDropdown(v => !v)}
                    aria-label="User menu"
                    aria-expanded={showDropdown}
                >
                    {user.name.charAt(0).toUpperCase()}
                </button>
                {showDropdown && (
                    <div className={styles.dropdown}>
                        <p className={styles.dropdownName}>{user.name}</p>
                        {user.email && <p className={styles.dropdownEmail}>{user.email}</p>}
                        <hr className={styles.dropdownDivider} />
                        <button
                            className={styles.manageAllergiesBtn}
                            onClick={() => setShowManageAllergies(v => !v)}
                        >
                            {showManageAllergies ? "Hide Allergies ▲" : "Manage Allergies ▼"}
                        </button>
                        {showManageAllergies && (
                            <AllergyChipSelector
                                selected={user.allergies ?? []}
                                onToggle={toggleDropdownAllergy}
                            />
                        )}
                        <hr className={styles.dropdownDivider} />
                        <button
                            className={styles.dropdownSignOut}
                            onClick={() => { logout(); setShowDropdown(false); }}
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <button className={styles.signInBtn} onClick={() => setShowSignIn(true)}>
                Sign In
            </button>
            {showSignIn && createPortal(
                <div
                    className={styles.modalOverlay}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowSignIn(false); }}
                >
                    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <button
                            className={styles.modalClose}
                            onClick={() => setShowSignIn(false)}
                            aria-label="Close sign in"
                        >
                            <XIcon size={20} />
                        </button>
                        <h2 className={styles.modalTitle} id="modal-title">Welcome 👋</h2>
                        <p className={styles.modalSubtitle}>Sign in to personalize your experience</p>
                        <div className={styles.modalForm}>
                            <input
                                className={styles.modalInput}
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleLogin()}
                                autoFocus
                            />
                            <input
                                className={styles.modalInput}
                                type="email"
                                placeholder="Email address (optional)"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleLogin()}
                            />
                            <AllergyChipSelector
                                selected={selectedAllergies}
                                onToggle={toggleAllergy}
                            />
                            <button
                                className={styles.modalBtn}
                                onClick={handleLogin}
                                disabled={!name.trim()}
                            >
                                Continue →
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

function AppHeader() {
    const pathname = usePathname();
    return (
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <Link href="/app" className={styles.logo}>
                    <span>🥗</span> MoodMeals
                </Link>
                <nav className={styles.desktopNav} aria-label="App navigation">
                    {NAV_LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`${styles.navLink} ${pathname === href ? styles.navLinkActive : ""}`}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
                <div className={styles.headerRight}>
                    <ThemeToggle />
                    <UserArea />
                    <Link href="/" className={styles.backLink}><ArrowLeftIcon /> Home</Link>
                </div>
            </div>
        </header>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <MoodProvider>
                <PantryProvider>
                    <GroceryProvider>
                        <JournalProvider>
                            <div className={styles.shell}>
                                <AppHeader />
                                <main className={styles.main}>
                                    {children}
                                </main>
                                <BottomNav />
                            </div>
                        </JournalProvider>
                    </GroceryProvider>
                </PantryProvider>
            </MoodProvider>
        </UserProvider>
    );
}
