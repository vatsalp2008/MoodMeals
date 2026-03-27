"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import type { AllergyType, MealPreference } from "@/types";
import styles from "./page.module.css";

const PREFERENCE_OPTIONS: { value: MealPreference; label: string }[] = [
    { value: "veg", label: "Vegetarian" },
    { value: "non-veg", label: "Non-Veg" },
    { value: "vegan", label: "Vegan" },
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

export default function ProfilePage() {
    const router = useRouter();
    const { user, authUser, profile, updateProfile, signOut, isLoggedIn } = useUser();
    const [savedMsg, setSavedMsg] = useState<string | null>(null);

    const flash = useCallback((msg: string) => {
        setSavedMsg(msg);
        setTimeout(() => setSavedMsg(null), 1500);
    }, []);

    const handlePreferenceChange = useCallback(
        (pref: MealPreference) => {
            updateProfile({ preference: pref });
            flash("Preference saved");
        },
        [updateProfile, flash],
    );

    const handleAllergyToggle = useCallback(
        (allergy: AllergyType) => {
            const current = (profile?.allergies ?? []) as AllergyType[];
            const updated = current.includes(allergy)
                ? current.filter((a) => a !== allergy)
                : [...current, allergy];
            updateProfile({ allergies: updated as string[] });
            flash("Allergies saved");
        },
        [profile, updateProfile, flash],
    );

    const handleSignOut = useCallback(async () => {
        await signOut();
        router.push("/");
    }, [signOut, router]);

    if (!isLoggedIn || !user) {
        return (
            <div className={styles.page}>
                <h1 className={styles.pageTitle}>Profile</h1>
                <p>You are not signed in.</p>
            </div>
        );
    }

    const avatarUrl = authUser?.user_metadata?.avatar_url as string | undefined;
    const currentPreference: MealPreference = profile?.preference ?? "veg";
    const currentAllergies = (profile?.allergies ?? []) as AllergyType[];

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Profile</h1>

            {savedMsg && <span className={styles.savedToast}>{savedMsg}</span>}

            {/* ── User Info ── */}
            <div className={styles.card}>
                <span className={styles.cardLabel}>Account</span>
                <div className={styles.userInfo}>
                    <div
                        className={styles.avatarCircle}
                        style={{ background: avatarUrl ? "transparent" : user.avatarColor }}
                    >
                        {avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={avatarUrl}
                                alt={user.name}
                                className={styles.avatarImg}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            user.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className={styles.userMeta}>
                        <span className={styles.userName}>{user.name}</span>
                        {user.email && (
                            <span className={styles.userEmail}>{user.email}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Dietary Preference ── */}
            <div className={styles.card}>
                <span className={styles.cardLabel}>Dietary Preference</span>
                <div className={styles.chipGroup}>
                    {PREFERENCE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`${styles.chip} ${currentPreference === opt.value ? styles.chipActive : ""}`}
                            onClick={() => handlePreferenceChange(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Allergies ── */}
            <div className={styles.card}>
                <span className={styles.cardLabel}>Allergies / Intolerances</span>
                <div className={styles.allergyChips}>
                    {ALLERGY_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`${styles.allergyChip} ${currentAllergies.includes(opt.value) ? styles.allergyChipActive : ""}`}
                            onClick={() => handleAllergyToggle(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Sign Out ── */}
            <button
                type="button"
                className={styles.signOutBtn}
                onClick={handleSignOut}
            >
                Sign Out
            </button>
        </div>
    );
}
