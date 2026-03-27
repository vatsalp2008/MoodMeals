"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./MealLibrary.module.css";
import { MEALS } from "../data/meals";
import type { Meal, MealCuisine, MealDietFocus, MealType, MealEffort } from "../types";
import { useMood } from "../context/MoodContext";
import { useGroceryOptional } from "../context/GroceryContext";
import { usePantry } from "../context/PantryContext";
import { useUser } from "../context/UserContext";
import { BUDGET_ALTERNATIVES } from "../data/budgetTips";
import GlossaryTerm from "./GlossaryTerm";


type CookTimeFilter = "all" | "quick" | "medium" | "long";

const CUISINE_OPTIONS: { value: MealCuisine | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Indian", label: "Indian" },
    { value: "Mediterranean", label: "Mediterranean" },
    { value: "Asian", label: "Asian" },
    { value: "Mexican", label: "Mexican" },
    { value: "American", label: "American" },
    { value: "Fusion", label: "Fusion" },
];

const DIET_OPTIONS: { value: MealDietFocus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "protein-heavy", label: "Protein-Heavy" },
    { value: "fiber-rich", label: "Fiber-Rich" },
    { value: "low-calorie", label: "Low-Cal" },
    { value: "balanced", label: "Balanced" },
];

const COOK_TIME_OPTIONS: { value: CookTimeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "quick", label: "Quick <20 min" },
    { value: "medium", label: "Medium 20–40 min" },
    { value: "long", label: "Long 40+ min" },
];

const MEAL_TYPE_OPTIONS: { value: MealType | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snack", label: "Snack" },
];

const isApiMeal = (meal: Meal) => meal.id.startsWith("spoon-");

/** Derive effort level for a meal (uses explicit field or computes from cookTime/ingredients). */
function getEffort(meal: Meal): MealEffort {
    if (meal.effort) return meal.effort;
    const ingCount = meal.ingredients?.length ?? 0;
    if (meal.cookTime <= 15 || ingCount <= 4) return "minimal";
    if (meal.cookTime <= 25) return "easy";
    if (meal.cookTime <= 40) return "moderate";
    return "involved";
}

/** Effort badge display config. */
function effortBadge(effort: MealEffort): { emoji: string; label: string } {
    switch (effort) {
        case "minimal": return { emoji: "\u26A1", label: "Quick" };
        case "easy": return { emoji: "\u26A1", label: "Quick" };
        case "moderate": return { emoji: "\uD83D\uDD50", label: "Moderate" };
        case "involved": return { emoji: "\uD83D\uDC68\u200D\uD83C\uDF73", label: "Involved" };
    }
}

/** Match a meal's ingredients against BUDGET_ALTERNATIVES (case-insensitive partial match). */
function getBudgetTips(meal: Meal): { ingredient: string; tip: string; store: string }[] {
    if (!meal.ingredients || meal.ingredients.length === 0) return [];
    const budgetKeys = Object.keys(BUDGET_ALTERNATIVES);
    const matches: { ingredient: string; tip: string; store: string }[] = [];
    for (const ing of meal.ingredients) {
        const ingLower = ing.name.toLowerCase();
        for (const key of budgetKeys) {
            if (ingLower.includes(key) || key.includes(ingLower)) {
                matches.push({
                    ingredient: ing.name,
                    tip: BUDGET_ALTERNATIVES[key].tip,
                    store: BUDGET_ALTERNATIVES[key].store,
                });
                break; // one match per ingredient
            }
        }
        if (matches.length >= 3) break;
    }
    return matches;
}

const MealLibrary = ({ gentleMode = false }: { gentleMode?: boolean }) => {
    const { analysis, preference, sustainMode } = useMood();
    const grocery = useGroceryOptional();
    const pantry = usePantry();
    const { user } = useUser();

    const pantryHasItems = pantry.items.length > 0;
    const userAllergies = user?.allergies ?? [];
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAllOverride, setShowAllOverride] = useState(false);

    // Dynamic API meals state
    const [apiMeals, setApiMeals] = useState<Meal[]>([]);
    const [apiLoading, setApiLoading] = useState(false);

    // Low-friction recipe mode state
    const [lowFrictionActive, setLowFrictionActive] = useState(false);
    const lowFrictionDismissedRef = useRef(false);

    // Granular filter state
    const [cuisineFilter, setCuisineFilter] = useState<MealCuisine | "all">("all");
    const [dietFilter, setDietFilter] = useState<MealDietFocus | "all">("all");
    const [cookTimeFilter, setCookTimeFilter] = useState<CookTimeFilter>("all");
    const [mealTypeFilter, setMealTypeFilter] = useState<MealType | "all">("all");

    const activeFilterCount = [
        cuisineFilter !== "all",
        dietFilter !== "all",
        cookTimeFilter !== "all",
        mealTypeFilter !== "all",
    ].filter(Boolean).length;

    const clearFilters = () => {
        setCuisineFilter("all");
        setDietFilter("all");
        setCookTimeFilter("all");
        setMealTypeFilter("all");
    };

    // Auto-apply suggestedFilters from AI analysis
    const appliedFiltersRef = useRef<string | null>(null);
    useEffect(() => {
        const filters = analysis?.suggestedFilters;
        if (!filters) return;
        const key = JSON.stringify(filters);
        if (key === appliedFiltersRef.current) return;
        appliedFiltersRef.current = key;

        if (filters.maxCookTime) {
            if (filters.maxCookTime <= 20) setCookTimeFilter("quick");
            else if (filters.maxCookTime <= 40) setCookTimeFilter("medium");
        }
        if (filters.mealType && filters.mealType !== "any") {
            const valid = ["breakfast", "lunch", "dinner", "snack"];
            if (valid.includes(filters.mealType)) setMealTypeFilter(filters.mealType as MealType);
        }
        if (filters.dietFocus && filters.dietFocus !== "any") {
            const valid = ["protein-heavy", "fiber-rich", "low-calorie", "balanced"];
            if (valid.includes(filters.dietFocus)) setDietFilter(filters.dietFocus as MealDietFocus);
        }

    }, [analysis?.suggestedFilters]);

    // Auto-detect low-friction need from clinical state (burnout / cognitive-fatigue)
    const prevClinicalRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const clinical = analysis?.clinicalState;
        if (clinical === prevClinicalRef.current) return;
        prevClinicalRef.current = clinical;

        const isLowFriction = clinical === "burnout" || clinical === "cognitive-fatigue";
        if (isLowFriction && !lowFrictionDismissedRef.current) {
            setLowFrictionActive(true);
            // Only auto-set cook time if suggestedFilters didn't already set it
            if (!analysis?.suggestedFilters?.maxCookTime) {
                setCookTimeFilter("quick");
            }
        } else {
            setLowFrictionActive(false);
        }
    }, [analysis?.clinicalState, analysis?.suggestedFilters?.maxCookTime]);

    const dismissLowFriction = () => {
        lowFrictionDismissedRef.current = true;
        setLowFrictionActive(false);
        setCookTimeFilter("all");
    };

    const targetMoods = useMemo((): string[] => {
        if (!analysis) return [];
        if (sustainMode === "winddown") return ["calm", "relaxed", "grounding", "comforting"];
        if (sustainMode === "sustain") return [...analysis.recommendedMoods, "energetic", "happy", "light"];
        return analysis.recommendedMoods;
    }, [analysis, sustainMode]);

    const targetedNutrients = useMemo(() => analysis?.targetedNutrients ?? [], [analysis]);

    // Fetch dynamic meals from Spoonacular when mood analysis changes
    useEffect(() => {
        if (targetedNutrients.length === 0) {
            setApiMeals([]);
            return;
        }

        let cancelled = false;
        setApiLoading(true);

        const params = new URLSearchParams({
            nutrients: targetedNutrients.join(","),
            preference,
            clinicalState: analysis?.clinicalState ?? "",
        });
        if (userAllergies.length > 0) {
            params.set("allergies", userAllergies.join(","));
        }

        fetch(`/api/meals?${params}`)
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) {
                    setApiMeals(data.meals ?? []);
                    setApiLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setApiMeals([]);
                    setApiLoading(false);
                }
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetedNutrients.join(","), preference, userAllergies.join(","), analysis?.clinicalState]);

    // Combine API meals + curated meals, filter and score
    const sortedMeals = useMemo(() => {
        // Curated meals: filter by allergens and preference
        // non-veg sees all; veg sees veg + vegan; vegan sees only vegan
        const curatedSafe = MEALS.filter((m) => {
            if (userAllergies.length > 0) {
                const mealAllergens = m.allergens ?? [];
                if (userAllergies.some((a) => mealAllergens.includes(a))) return false;
            }
            if (preference === "non-veg") return true;
            if (preference === "veg") return m.preference === "veg" || m.preference === "vegan";
            return m.preference === "vegan";
        });

        // Merge: API meals first (already filtered server-side), then curated
        const combined: Meal[] = [...apiMeals, ...curatedSafe];

        // Apply granular filters
        const granularFiltered = combined.filter((m) => {
            if (cuisineFilter !== "all" && m.cuisine !== cuisineFilter) return false;
            if (dietFilter !== "all" && m.dietFocus !== dietFilter) return false;
            if (cookTimeFilter === "quick" && m.cookTime >= 20) return false;
            if (cookTimeFilter === "medium" && (m.cookTime < 20 || m.cookTime > 40)) return false;
            if (cookTimeFilter === "long" && m.cookTime <= 40) return false;
            if (mealTypeFilter !== "all" && m.mealType !== mealTypeFilter) return false;
            return true;
        });

        // Mood-based filtering (only when analysis exists)
        const filtered = analysis
            ? granularFiltered.filter((m) => m.moodSync.some((tag) => targetMoods.includes(tag)))
            : granularFiltered;

        const displayMeals = filtered.length > 0 ? filtered : granularFiltered;

        return [...displayMeals]
            .map((meal) => {
                const moodTagMatches = targetMoods.length
                    ? meal.moodSync.filter((tag) => targetMoods.includes(tag)).length
                    : 0;

                let nutrientMatches = 0;
                if (targetedNutrients.length > 0 && meal.nutrientProfile) {
                    const profileKeys = Object.keys(meal.nutrientProfile).map((k) => k.toLowerCase());
                    nutrientMatches = targetedNutrients.filter((n) =>
                        profileKeys.some((pk) => pk.includes(n.toLowerCase()) || n.toLowerCase().includes(pk)),
                    ).length;
                }

                // API meals get a bonus since they're already nutrient-targeted
                const apiBonus = isApiMeal(meal) ? 3 : 0;

                // Low-friction boost: minimal/easy effort meals score higher when burnout detected
                let effortBonus = 0;
                if (lowFrictionActive) {
                    const effort = getEffort(meal);
                    if (effort === "minimal") effortBonus = 6;
                    else if (effort === "easy") effortBonus = 4;
                    // Also boost fewer-ingredient meals (normalize: 10-ingCount capped at 0)
                    const ingCount = meal.ingredients?.length ?? 0;
                    effortBonus += Math.max(0, 10 - ingCount) * 0.3;
                }

                const score = moodTagMatches * 2 + nutrientMatches + apiBonus + effortBonus;
                return { ...meal, score, matched: moodTagMatches > 0 || nutrientMatches > 0 || isApiMeal(meal) };
            })
            .sort((a, b) => b.score - a.score);
    }, [userAllergies, preference, apiMeals, cuisineFilter, dietFilter, cookTimeFilter, mealTypeFilter, analysis, targetMoods, targetedNutrients, lowFrictionActive]);

    const apiMealCount = sortedMeals.filter((m) => isApiMeal(m)).length;

    return (
        <section id="recipes" className={styles.section}>
            <div className="container">
                {analysis ? (
                    <div className={styles.analysisResult}>
                        <span className={styles.emotion}>
                            {emotionEmoji(analysis.emotion)} {capitalize(analysis.emotion)}
                            {sustainMode === "sustain" && " · Sustaining 🚀"}
                            {sustainMode === "winddown" && " · Winding Down 😌"}
                        </span>
                        <p className={styles.aiMessage}>{analysis.message}</p>
                        {analysis.targetedNutrients && analysis.targetedNutrients.length > 0 && (
                            <div className={styles.targetedNutrients}>
                                {analysis.targetedNutrients.map((nutrient) => (
                                    <span key={nutrient} className={styles.nutrientBadge}>
                                        {nutrient}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <h2 className={styles.title}>Explore by Choice</h2>
                        <p className={styles.placeholder}>
                            ✨ Share how you&apos;re feeling above and we&apos;ll recommend the best meals for your mood.
                        </p>
                    </>
                )}

                {/* Filter bar — hidden in gentle mode to reduce decisions */}
                {!gentleMode && (
                    <div className={styles.filterBar}>
                        <div className={styles.filterBarHeader}>
                            <span className={styles.filterBarTitle}>
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className={styles.filterCount}>{activeFilterCount}</span>
                                )}
                            </span>
                            {activeFilterCount > 0 && (
                                <button className={styles.clearFiltersLink} onClick={clearFilters}>
                                    Clear all filters
                                </button>
                            )}
                        </div>

                        <div className={styles.filterGrid}>
                            <div className={styles.filterRow}>
                                <span className={styles.filterRowLabel}>Cuisine</span>
                                <div className={styles.chipRow}>
                                    {CUISINE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`${styles.chip} ${cuisineFilter === opt.value ? styles.chipActive : ""}`}
                                            onClick={() => setCuisineFilter(opt.value as MealCuisine | "all")}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.filterRow}>
                                <span className={styles.filterRowLabel}>Diet Focus</span>
                                <div className={styles.chipRow}>
                                    {DIET_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`${styles.chip} ${dietFilter === opt.value ? styles.chipActive : ""}`}
                                            onClick={() => setDietFilter(opt.value as MealDietFocus | "all")}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.filterRow}>
                                <span className={styles.filterRowLabel}>Cook Time</span>
                                <div className={styles.chipRow}>
                                    {COOK_TIME_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`${styles.chip} ${cookTimeFilter === opt.value ? styles.chipActive : ""}`}
                                            onClick={() => setCookTimeFilter(opt.value)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.filterRow}>
                                <span className={styles.filterRowLabel}>Meal Type</span>
                                <div className={styles.chipRow}>
                                    {MEAL_TYPE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`${styles.chip} ${mealTypeFilter === opt.value ? styles.chipActive : ""}`}
                                            onClick={() => setMealTypeFilter(opt.value as MealType | "all")}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Low-friction mode banner */}
                {lowFrictionActive && (
                    <div className={styles.lowFrictionBanner}>
                        <span className={styles.lowFrictionText}>
                            🍳 Showing quick &amp; easy recipes — you deserve a break
                        </span>
                        <button
                            className={styles.lowFrictionDismiss}
                            onClick={dismissLowFriction}
                        >
                            Show all recipes
                        </button>
                    </div>
                )}

                {userAllergies.length > 0 && (
                    <p className={styles.filterNote}>
                        🛡️ Filtered for your dietary needs ({userAllergies.length} allergen{userAllergies.length !== 1 ? "s" : ""} excluded)
                    </p>
                )}

                {analysis && (
                    <p className={styles.filterNote}>
                        ✨ Showing meals matched to your mood.
                        {apiMealCount > 0 && ` ${apiMealCount} personalized recipes found.`}
                        {apiLoading && " Loading more personalized recipes..."}
                    </p>
                )}

                {/* Loading skeleton for API meals */}
                {apiLoading && analysis && (
                    <div className={styles.exploreGrid}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={styles.skeletonCard}>
                                <div className={styles.skeletonImg} />
                                <div className={styles.skeletonBody}>
                                    <div className={styles.skeletonLine} style={{ width: "75%" }} />
                                    <div className={styles.skeletonLine} style={{ width: "50%" }} />
                                    <div className={styles.skeletonBadges}>
                                        <div className={styles.skeletonBadge} />
                                        <div className={styles.skeletonBadge} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.grid}>
                    {(gentleMode && !showAllOverride ? sortedMeals.slice(0, 3) : sortedMeals).map((meal, idx) => {
                        const isExpanded = expandedId === meal.id || (gentleMode && !showAllOverride && idx === 0);
                        const isFromApi = isApiMeal(meal);
                        return (
                            <div
                                key={meal.id}
                                className={`${styles.card} ${meal.matched ? styles.recommended : ""}`}
                            >
                                {meal.matched && !isFromApi && (
                                    <div className={styles.recommendedBadge}>✨ Recommended for you</div>
                                )}
                                {isFromApi && (
                                    <div className={styles.recommendedBadge}>🧬 Personalized Match</div>
                                )}
                                <div className={styles.imgWrap}>
                                    {isFromApi ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={meal.image}
                                            alt={meal.name}
                                            className={styles.img}
                                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                        />
                                    ) : (
                                        <Image
                                            src={meal.image}
                                            alt={meal.name}
                                            fill
                                            className={styles.img}
                                        />
                                    )}
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.cardTitle}>{meal.name}</h3>

                                    {/* Pantry availability badge */}
                                    {pantryHasItems && meal.ingredients && meal.ingredients.length > 0 && (() => {
                                        const inPantryCount = meal.ingredients.filter((ing) => pantry.hasItem(ing.name)).length;
                                        const total = meal.ingredients.length;
                                        if (inPantryCount === total) {
                                            return (
                                                <span className={`${styles.pantryBadge} ${styles.pantryBadgeFull}`}>
                                                    ✓ All ingredients available
                                                </span>
                                            );
                                        }
                                        if (inPantryCount > 0) {
                                            return (
                                                <span className={`${styles.pantryBadge} ${styles.pantryBadgePartial}`}>
                                                    {inPantryCount}/{total} in pantry
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <p className={styles.cardDesc}>{meal.description}</p>

                                    {/* Ingredients — compact inline list */}
                                    {meal.ingredients && meal.ingredients.length > 0 && (() => {
                                        const maxVisible = 5;
                                        const visible = meal.ingredients.slice(0, maxVisible);
                                        const hiddenCount = meal.ingredients.length - maxVisible;
                                        return (
                                            <p className={styles.ingredientLine}>
                                                <span className={styles.ingredientLabel}>Ingredients:</span>{" "}
                                                {visible.map((ing, i) => {
                                                    const inPantry = pantryHasItems && pantry.hasItem(ing.name);
                                                    return (
                                                        <span key={ing.name}>
                                                            <span className={inPantry ? styles.ingredientInPantry : ""} title={ing.amount || undefined}>
                                                                {inPantry && "✓ "}{ing.name},
                                                            </span>
                                                            {i < visible.length - 1 && <span className={styles.ingredientSep}> · </span>}
                                                        </span>
                                                    );
                                                })}
                                                {hiddenCount > 0 && (
                                                    <span className={styles.ingredientSep}> · +{hiddenCount} more</span>
                                                )}
                                            </p>
                                        );
                                    })()}

                                    {/* Budget Tips — matched from BUDGET_ALTERNATIVES */}
                                    {(() => {
                                        const tips = getBudgetTips(meal);
                                        if (tips.length === 0) return null;
                                        return (
                                            <div className={styles.budgetSection}>
                                                <div className={styles.budgetTitle}>💰 Budget Tips</div>
                                                {tips.map((t) => (
                                                    <div key={t.ingredient} className={styles.budgetTip}>
                                                        • {t.ingredient} — <span className={styles.budgetStore}>{t.store}</span>{" "}
                                                        {t.tip.replace(/^[^—]*—\s*/, "")}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    <div className={styles.cardMeta}>
                                        <span className={`${styles.metaTag} ${styles[`pref-${meal.preference}`]}`}>
                                            {meal.preference === "veg" ? "🥗 Veg" : meal.preference === "vegan" ? "🌱 Vegan" : "🍗 Non-Veg"}
                                        </span>
                                        <span className={styles.metaTag}>🕐 {meal.cookTime}m</span>
                                        <span className={styles.metaTag}>{meal.mealType}</span>
                                        <span className={styles.metaTag}>{meal.cuisine}</span>
                                        {(() => {
                                            const effort = getEffort(meal);
                                            const badge = effortBadge(effort);
                                            return (
                                                <span className={`${styles.metaTag} ${styles.effortBadge} ${styles[`effort-${effort}`]}`}>
                                                    {badge.emoji} {badge.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className={styles.cardFooter}>
                                        <div className={styles.moodTags}>
                                            {meal.moodSync.slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className={`${styles.moodTag} ${targetMoods.includes(tag) ? styles.moodTagActive : ""}`}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <GlossaryTerm term="kcal">
                                            <span className={styles.calories}>
                                                {meal.calories} kcal
                                                <span className={styles.caloriesPct}>{Math.round((meal.calories / 2000) * 100)}% DV</span>
                                            </span>
                                        </GlossaryTerm>
                                    </div>

                                    <button
                                        className={styles.whyToggle}
                                        onClick={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        <span>Why this meal?</span>
                                        <span className={styles.whyChevron}>
                                            {isExpanded ? "▲" : "▼"}
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className={styles.whyContent}>
                                            <p className={styles.whyText}>{meal.whyThisMeal}</p>
                                            <div className={styles.nutrients}>
                                                {meal.nutrients.map((n) => (
                                                    <div key={n.label} className={styles.nutrient}>
                                                        <span className={styles.nutrientValue}>{n.value}</span>
                                                        <span className={styles.nutrientLabel}>{n.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* View original recipe link for API meals */}
                                    {isFromApi && meal.sourceUrl && (
                                        <a
                                            href={meal.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.viewRecipeLink}
                                        >
                                            View Full Recipe ↗
                                        </a>
                                    )}

                                    {grocery && (
                                        <button
                                            className={`${styles.addToListBtn} ${grocery.hasMeal(meal.id) ? styles.addedBtn : ""}`}
                                            onClick={() =>
                                                grocery.hasMeal(meal.id)
                                                    ? grocery.removeMeal(meal.id)
                                                    : grocery.addMeal(meal)
                                            }
                                        >
                                            {grocery.hasMeal(meal.id) ? "✓ Added to Grocery" : "+ Add to Grocery"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {gentleMode && !showAllOverride && sortedMeals.length > 3 && (
                    <button
                        className={styles.showAllBtn}
                        onClick={() => setShowAllOverride(true)}
                    >
                        See more options when you&apos;re ready
                    </button>
                )}

                {/* Source attribution — hidden in gentle mode */}
                {!gentleMode && apiMealCount > 0 && (
                    <p className={styles.sourceAttribution}>
                        Personalized recipes powered by Spoonacular · Nutrient science from nutritional psychiatry research
                    </p>
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
