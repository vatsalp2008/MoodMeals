"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGrocery } from "@/context/GroceryContext";
import { usePantry } from "@/context/PantryContext";
import { SEATTLE_BUDGET_TIPS, BUDGET_ALTERNATIVES, TIP_CATEGORY_ICONS } from "@/data/budgetTips";
import styles from "./page.module.css";

const CAT_ICONS: Record<string, string> = {
    protein: "🥩", grain: "🌾", vegetable: "🥦",
    dairy: "🥛", spice: "🌿", other: "🫙",
};
const CAT_LABELS: Record<string, string> = {
    protein: "Proteins", grain: "Grains", vegetable: "Vegetables",
    dairy: "Dairy", spice: "Spices & Herbs", other: "Other",
};
const CAT_ORDER = ["protein", "grain", "vegetable", "dairy", "spice", "other"];

interface AggIngredient {
    name: string;
    amounts: string[];
    inPantry: boolean;
    category: string;
    totalMultiplier: number;
}

/** Parse a leading number (supports unicode fractions). Returns null for "to taste" etc. */
function parseLeadingNumber(amount: string): { num: number; rest: string } | null {
    if (/to taste|a few|as needed/i.test(amount)) return null;

    const unicodeFracs: Record<string, number> = {
        "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125,
    };

    let str = amount.trim();
    let num = 0;
    let rest = str;

    // Leading integer
    const intMatch = str.match(/^(\d+)\s*(.*)/);
    if (intMatch) {
        num += parseInt(intMatch[1], 10);
        rest = intMatch[2];
    }

    // Unicode fraction immediately after integer (e.g. "1½")
    for (const [ch, val] of Object.entries(unicodeFracs)) {
        if (rest.startsWith(ch)) {
            num += val;
            rest = rest.slice(ch.length).trimStart();
            break;
        }
    }

    // Standalone unicode fraction with no leading integer
    if (num === 0) {
        for (const [ch, val] of Object.entries(unicodeFracs)) {
            if (str.startsWith(ch)) {
                num = val;
                rest = str.slice(ch.length).trimStart();
                break;
            }
        }
    }

    if (num === 0) return null;
    return { num, rest };
}

function multiplyAmount(amount: string, multiplier: number): string {
    if (multiplier === 1) return amount;
    const parsed = parseLeadingNumber(amount);
    if (!parsed) return amount;

    const result = parsed.num * multiplier;
    const formatted = Number.isInteger(result)
        ? result.toString()
        : parseFloat(result.toFixed(2)).toString();
    return parsed.rest ? `${formatted} ${parsed.rest}` : formatted;
}

export default function GroceryPage() {
    const {
        selectedMeals, removeMeal, clearMeals,
        mealServings, setServings,
        mealPrepDays, setMealPrepDays,
    } = useGrocery();
    const { hasItem, addItems, addItem } = usePantry();

    const mealPrepEnabled = mealPrepDays > 1;
    const [budgetMode, setBudgetMode] = useState(false);
    const [showAllTips, setShowAllTips] = useState(false);
    const [successCount, setSuccessCount] = useState<number | null>(null);

    const handlePrepToggle = () => {
        setMealPrepDays(mealPrepEnabled ? 1 : 3);
    };

    useEffect(() => {
        if (successCount !== null) {
            const t = setTimeout(() => setSuccessCount(null), 3000);
            return () => clearTimeout(t);
        }
    }, [successCount]);

    const { grouped, totalCal, estimatedBudget } = useMemo(() => {
        const prepMultiplier = mealPrepEnabled ? mealPrepDays : 1;

        const g = selectedMeals
            .flatMap(meal => {
                const servings = mealServings[meal.id] ?? 1;
                const multiplier = servings * prepMultiplier;
                return (meal.ingredients ?? []).map(ing => ({
                    ...ing,
                    displayAmount: multiplyAmount(ing.amount, multiplier),
                    totalMultiplier: multiplier,
                }));
            })
            .reduce<Record<string, AggIngredient[]>>((acc, ing) => {
                if (!acc[ing.category]) acc[ing.category] = [];
                const existing = acc[ing.category].find(
                    i => i.name.toLowerCase() === ing.name.toLowerCase()
                );
                if (existing) {
                    existing.amounts.push(ing.displayAmount);
                } else {
                    acc[ing.category].push({
                        name: ing.name,
                        amounts: [ing.displayAmount],
                        inPantry: hasItem(ing.name),
                        category: ing.category,
                        totalMultiplier: ing.totalMultiplier,
                    });
                }
                return acc;
            }, {});

        const cal = selectedMeals.reduce((s, m) => {
            const servings = mealServings[m.id] ?? 1;
            return s + m.calories * servings * prepMultiplier;
        }, 0);

        return { grouped: g, totalCal: cal, estimatedBudget: ((cal / 100) * 4).toFixed(2) };
    }, [selectedMeals, mealServings, mealPrepEnabled, mealPrepDays, hasItem]);

    const handleAddAllToPantry = () => {
        const allIngredients = selectedMeals.flatMap(meal => {
            const servings = mealServings[meal.id] ?? 1;
            const prepMultiplier = mealPrepEnabled ? mealPrepDays : 1;
            const multiplier = servings * prepMultiplier;
            return (meal.ingredients ?? []).map(ing => ({
                name: ing.name,
                category: ing.category as "protein" | "grain" | "vegetable" | "dairy" | "spice" | "other",
                amount: multiplyAmount(ing.amount, multiplier),
            }));
        });

        const seen = new Set<string>();
        let count = 0;
        for (const ing of allIngredients) {
            const key = ing.name.toLowerCase();
            if (seen.has(key) || hasItem(ing.name)) continue;
            seen.add(key);

            const parsed = parseLeadingNumber(ing.amount);
            const quantity = parsed?.num;
            // Extract unit from the rest string
            const unitStr = parsed?.rest?.trim().split(/\s/)[0]?.toLowerCase() ?? "";
            const VALID_UNITS = ["g","kg","ml","l","oz","lb","cups","tbsp","tsp","pieces","bunch"];
            const unit = VALID_UNITS.includes(unitStr) ? unitStr : "";

            addItem(ing.name, ing.category, quantity, unit as any);
            count++;
        }
        setSuccessCount(count);
    };

    if (selectedMeals.length === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Grocery List</h1>
                </div>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🛒</div>
                    <p className={styles.emptyTitle}>No meals selected yet</p>
                    <p className={styles.emptyText}>
                        Add meals to your list from the dashboard.
                    </p>
                    <Link href="/app" className={styles.emptyLink}>Go to Dashboard →</Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <h1 className={styles.title}>Grocery List</h1>
                    <div className={styles.headerActions}>
                        <Link href="/app/calendar" className={styles.calendarLink}>
                            <span aria-hidden="true">📅</span> Plan Meals on Calendar
                        </Link>
                        <button className={styles.clearBtn} onClick={clearMeals}>Clear all</button>
                    </div>
                </div>
                <p className={styles.subtitle}>
                    {selectedMeals.length} meal{selectedMeals.length !== 1 ? "s" : ""} selected
                </p>

                {/* Meal Prep toggle */}
                <div className={styles.prepRow}>
                    <div className={styles.prepToggleWrap}>
                        <button
                            className={`${styles.prepToggle} ${mealPrepEnabled ? styles.prepToggleOn : ""}`}
                            onClick={handlePrepToggle}
                            aria-checked={mealPrepEnabled}
                            role="switch"
                        >
                            <span className={styles.prepToggleThumb} />
                        </button>
                        <span className={styles.prepLabel}>
                            {mealPrepEnabled
                                ? `Meal Prep — Prepping for ${mealPrepDays} day${mealPrepDays !== 1 ? "s" : ""}`
                                : "Meal Prep"}
                        </span>
                    </div>
                    {mealPrepEnabled && (
                        <div className={styles.prepDays}>
                            {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                <button
                                    key={d}
                                    className={`${styles.prepDayBtn} ${mealPrepDays === d ? styles.prepDayBtnActive : ""}`}
                                    onClick={() => setMealPrepDays(d)}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Budget mode toggle */}
                <div className={styles.prepRow}>
                    <div className={styles.prepToggleWrap}>
                        <button
                            className={`${styles.prepToggle} ${budgetMode ? styles.prepToggleOn : ""}`}
                            onClick={() => setBudgetMode(v => !v)}
                            aria-checked={budgetMode}
                            role="switch"
                        >
                            <span className={styles.prepToggleThumb} />
                        </button>
                        <span className={styles.prepLabel}>Budget Mode 💰</span>
                    </div>
                </div>
            </div>

            <div className={styles.container}>
                {/* Sidebar: selected meal cards */}
                <div className={styles.sidebar}>
                    <div className={styles.mealCards}>
                        {selectedMeals.map(meal => {
                            const servings = mealServings[meal.id] ?? 1;
                            return (
                                <div key={meal.id} className={styles.mealCard}>
                                    <div className={styles.mealImg}>
                                        <Image src={meal.image} alt={meal.name} fill className={styles.mealImgEl} />
                                    </div>
                                    <div className={styles.mealInfo}>
                                        <p className={styles.mealName}>{meal.name}</p>
                                        <p className={styles.mealCal}>{meal.calories} kcal</p>
                                    </div>
                                    <div className={styles.servingsControl}>
                                        {[1, 2, 3, 4].map(n => (
                                            <button
                                                key={n}
                                                className={`${styles.servingBtn} ${servings === n ? styles.servingBtnActive : ""}`}
                                                onClick={() => setServings(meal.id, n)}
                                                aria-label={`${n} serving${n !== 1 ? "s" : ""}`}
                                            >
                                                {n}×
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className={styles.mealRemove}
                                        onClick={() => removeMeal(meal.id)}
                                        aria-label={`Remove ${meal.name}`}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Budget estimate */}
                    <div className={styles.budget}>
                        <span className={styles.budgetLabel}>Estimated grocery budget</span>
                        <span className={styles.budgetAmount}>${estimatedBudget}</span>
                    </div>
                </div>

                {/* Main column: ingredients + tips + pantry action */}
                <div className={styles.mainCol}>
                    <div className={styles.ingredientSection}>
                        <h2 className={styles.sectionTitle}>Ingredients needed</h2>

                        {CAT_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
                            <div key={cat} className={styles.catGroup}>
                                <h3 className={styles.catTitle}>
                                    {CAT_ICONS[cat] || "📦"} {CAT_LABELS[cat] || cat}
                                </h3>
                                <ul className={styles.ingList}>
                                    {grouped[cat].map(ing => (
                                        <li
                                            key={ing.name}
                                            className={`${styles.ingItem} ${ing.inPantry ? styles.inPantry : ""}`}
                                        >
                                            <span className={styles.ingCheck}>
                                                {ing.inPantry ? "✓" : "○"}
                                            </span>
                                            <span className={styles.ingName}>
                                                {ing.name}
                                                {budgetMode && BUDGET_ALTERNATIVES[ing.name.toLowerCase()] && (
                                                    <span className={styles.budgetTipBadge}>
                                                        💰 {BUDGET_ALTERNATIVES[ing.name.toLowerCase()].tip}
                                                    </span>
                                                )}
                                            </span>
                                            <span className={styles.ingAmount}>
                                                {ing.amounts.join(", ")}
                                                {ing.totalMultiplier > 1 && (
                                                    <span className={styles.multiplierBadge}>
                                                        ×{ing.totalMultiplier}
                                                    </span>
                                                )}
                                            </span>
                                            {ing.inPantry && (
                                                <span className={styles.pantryBadge}>In pantry</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Seattle Budget Tips */}
                    {budgetMode && (
                        <div className={styles.tipsCard}>
                            <h3 className={styles.tipsCardTitle}>🏫 Seattle Student Savings</h3>
                            {(showAllTips ? SEATTLE_BUDGET_TIPS : SEATTLE_BUDGET_TIPS.slice(0, 3)).map(tip => (
                                <div key={tip.id} className={styles.tipItem}>
                                    <span className={styles.tipIcon}>{TIP_CATEGORY_ICONS[tip.category] || "💡"}</span>
                                    <div className={styles.tipContent}>
                                        <p className={styles.tipTitle}>{tip.title}</p>
                                        <p className={styles.tipDesc}>{tip.description}</p>
                                    </div>
                                    {tip.savingsEstimate && (
                                        <span className={styles.tipSavings}>Save {tip.savingsEstimate}</span>
                                    )}
                                </div>
                            ))}
                            {SEATTLE_BUDGET_TIPS.length > 3 && (
                                <button
                                    className={styles.seeAllBtn}
                                    onClick={() => setShowAllTips(v => !v)}
                                >
                                    {showAllTips ? "Show less" : `See all ${SEATTLE_BUDGET_TIPS.length} tips`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Done shopping — Add all to pantry */}
                    <div className={styles.addToPantryWrap}>
                        {successCount !== null && (
                            <div className={styles.successMsg}>
                                ✓ Added {successCount} item{successCount !== 1 ? "s" : ""} to your pantry!
                            </div>
                        )}
                        <button className={styles.addToPantryBtn} onClick={handleAddAllToPantry}>
                            🛍 Mark as Shopped — Add to Pantry
                        </button>
                        <p className={styles.addToPantryHint}>
                            Done shopping? Add everything to your pantry.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
