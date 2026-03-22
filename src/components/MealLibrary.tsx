"use client";

import React, { useState } from "react";
import Image from "next/image";
import styles from "./MealLibrary.module.css";
import { MEALS } from "../data/meals";
import { MealPreference } from "../types";
import { useMood } from "../context/MoodContext";
import { buildGroceryList } from "../lib/grocery/buildGroceryList";
import { getMealIngredientsForMoodTags } from "../lib/grocery/ingredients";
import { normalizeTextKey } from "../lib/grocery/normalize";
import GroceryList from "./GroceryList";

const MealLibrary = () => {
    const { analysis, preference, setPreference, pantryItems, budget } = useMood();
    const [localPreference, setLocalPreference] = useState<MealPreference>(preference);

    // Sync local state with context
    const handlePreference = (p: MealPreference) => {
        setLocalPreference(p);
        setPreference(p);
    };

    // First filter by dietary preference
    const byPreference = MEALS.filter((m) => m.preference === localPreference);

    // Then score by mood match if AI analysis exists
    const pantrySet = new Set(pantryItems.map((p) => normalizeTextKey(p)));

    const scoredMeals = byPreference.map((meal) => {
        if (!analysis) return { ...meal, score: 0, matched: false };

        const matchedTags = meal.moodSync.filter((tag) => analysis.recommendedMoods.includes(tag));
        const matchCount = matchedTags.length;

        // Pantry-aware ranking: reward meals whose ingredients overlap with what the user already has.
        const mealIngredients = getMealIngredientsForMoodTags(meal, analysis.recommendedMoods);
        const pantryOverlap = mealIngredients.filter((ing) => pantrySet.has(normalizeTextKey(ing))).length;

        const score = matchCount * 10 + pantryOverlap;
        return { ...meal, score, matched: matchCount > 0 };
    });

    // Sort: matched meals first, then by score desc
    const sortedMeals = [...scoredMeals].sort((a, b) => b.score - a.score);

    const recommendedMeals = analysis ? sortedMeals.filter((m) => m.matched).slice(0, 3) : [];
    const grocery = analysis
        ? buildGroceryList({
            meals: recommendedMeals,
            pantryItems,
            budget,
            moodTags: analysis.recommendedMoods,
        })
        : null;

    return (
        <section id="recipes" className={styles.section}>
            <div className="container">
                {analysis ? (
                    <div className={styles.analysisResult}>
                        <span className={styles.emotion}>
                            {emotionEmoji(analysis.emotion)} {capitalize(analysis.emotion)}
                        </span>
                        <p className={styles.aiMessage}>{analysis.message}</p>
                    </div>
                ) : (
                    <h2 className={styles.title}>Explore by Choice</h2>
                )}

                <div className={styles.selector}>
                    {(["veg", "non-veg", "vegan"] as const).map((p) => (
                        <button
                            key={p}
                            className={`${styles.btn} ${localPreference === p ? styles.active : ""}`}
                            onClick={() => handlePreference(p)}
                        >
                            {p === "veg" ? "🥗 Vegetarian" : p === "non-veg" ? "🍗 Non-Veg" : "🌱 Vegan"}
                        </button>
                    ))}
                </div>

                {analysis && (
                    <p className={styles.filterNote}>
                        ✨ Meals are sorted by your mood match. Highlighted ones are recommended for you.
                    </p>
                )}

                <div className={styles.grid}>
                    {sortedMeals.map((meal) => (
                        <div
                            key={meal.id}
                            className={`${styles.card} ${meal.matched ? styles.recommended : ""}`}
                        >
                            {meal.matched && (
                                <div className={styles.recommendedBadge}>✨ Recommended for you</div>
                            )}
                            <div className={styles.imgWrap}>
                                <Image
                                    src={meal.image}
                                    alt={meal.name}
                                    fill
                                    className={styles.img}
                                />
                            </div>
                            <div className={styles.cardBody}>
                                <h3 className={styles.cardTitle}>{meal.name}</h3>
                                <p className={styles.cardDesc}>{meal.description}</p>

                                {analysis && meal.matched && (
                                    <div className={styles.whyCard} aria-label="Why this meal?">
                                        <div className={styles.whyTitle}>Why this meal?</div>
                                        {meal.moodSync
                                            .filter((tag) => analysis.recommendedMoods.includes(tag))
                                            .slice(0, 3)
                                            .map((tag) => {
                                                const nutrients = meal.nutrientsByMood[tag] ?? [];
                                                const ingredients = meal.ingredientsByMood[tag] ?? [];

                                                // Keep copy short but specific: mood tag -> nutrients -> key ingredients.
                                                const nutrientText = nutrients.length ? nutrients.join(", ") : "nutrient support";
                                                const ingredientText = ingredients.length ? ingredients.slice(0, 3).join(", ") : "fresh ingredients";

                                                return (
                                                    <p key={tag} className={styles.whyText}>
                                                        For <span className={styles.whyTag}>{tag}</span>: {nutrientText}. Key ingredients: {ingredientText}.
                                                    </p>
                                                );
                                            })}
                                    </div>
                                )}

                                <div className={styles.cardFooter}>
                                    <div className={styles.moodTags}>
                                        {meal.moodSync.slice(0, 2).map((tag) => (
                                            <span
                                                key={tag}
                                                className={`${styles.moodTag} ${analysis?.recommendedMoods.includes(tag) ? styles.moodTagActive : ""}`}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <span className={styles.calories}>{meal.calories} kcal</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {analysis && recommendedMeals.length > 0 && grocery && (
                    <GroceryList
                        items={grocery.items}
                        totalCost={grocery.totalCost}
                        budget={grocery.budget}
                        substitutions={grocery.substitutions}
                        note={grocery.note}
                    />
                )}
            </div>
        </section>
    );
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const emotionEmoji = (emotion: string): string => {
    const map: Record<string, string> = {
        stressed: "😤", tired: "😴", anxious: "😰", happy: "😊",
        focused: "🎯", calm: "😌", sad: "😢", energetic: "⚡",
    };
    return map[emotion] ?? "🧠";
};

export default MealLibrary;
