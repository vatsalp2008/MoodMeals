"use client";

import React, { useMemo } from "react";
import { useMood } from "../context/MoodContext";
import styles from "./PantryBudgetPanel.module.css";
import { INGREDIENT_CATALOG } from "../data/ingredientCatalog";
import { normalizeTextKey } from "../lib/grocery/normalize";

const parsePantryInput = (raw: string) => {
    const knownIngredientKeys = new Set(Object.keys(INGREDIENT_CATALOG).map((k) => normalizeTextKey(k)));

    const isKnownIngredient = (s: string) => {
        const key = normalizeTextKey(s);
        return knownIngredientKeys.has(key);
    };

    const splitTokensIfSafe = (chunk: string) => {
        // Preserve multi-word ingredients when the whole chunk is a known key
        // (e.g. "leafy greens", "sweet potato", "pumpkin seeds").
        if (isKnownIngredient(chunk)) return [chunk];

        // Otherwise, if every token is a known ingredient, split on whitespace.
        const tokens = chunk
            .split(/\s+/g)
            .map((t) => t.trim())
            .filter(Boolean);

        if (tokens.length <= 1) return [chunk];
        if (tokens.every((t) => isKnownIngredient(t))) return tokens;

        // Unknown multi-token phrase: keep as one ingredient string.
        return [chunk];
    };

    return Array.from(
        new Set(
            raw
                // Allow comma/newline/semicolon separators.
                .split(/[,;\n]/g)
                .map((s) => s.trim())
                .filter(Boolean)
                .flatMap((chunk) => splitTokensIfSafe(chunk))
        )
    );
};

const PantryBudgetPanel = () => {
    const { pantryItems, setPantryItems, budget, setBudget } = useMood();
    const pantryTextValue = useMemo(() => pantryItems.join(", "), [pantryItems]);

    return (
        <section id="pantry-budget" className={styles.section}>
            <div className="container">
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Pantry-aware recommendations</h2>
                        <p className={styles.subtitle}>Tell us what you already have, and set a budget for the grocery list.</p>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="pantry-input">
                                Pantry items
                            </label>
                            <textarea
                                id="pantry-input"
                                className={styles.textarea}
                                rows={4}
                                value={pantryTextValue}
                                placeholder="e.g., quinoa, spinach, olive oil, chickpeas"
                                onChange={(e) => setPantryItems(parsePantryInput(e.target.value))}
                            />
                            <div className={styles.pills} aria-label="Parsed pantry items">
                                {pantryItems.length === 0 ? (
                                    <span className={styles.placeholder}>No pantry items yet.</span>
                                ) : (
                                    pantryItems.map((p) => (
                                        <span key={p} className={styles.pill}>
                                            {p}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="budget-input">
                                Budget (USD)
                            </label>
                            <input
                                id="budget-input"
                                type="number"
                                min={0}
                                step={1}
                                className={styles.input}
                                value={budget}
                                onChange={(e) => setBudget(Number(e.target.value))}
                            />
                            <p className={styles.help}>
                                If we exceed your budget, we prioritize nutrient-first items and apply substitutions when possible.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PantryBudgetPanel;

