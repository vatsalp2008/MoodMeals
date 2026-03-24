"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import styles from "./MealLibrary.module.css";
import { MEALS } from "../data/meals";
import { MealCuisine, MealDietFocus, MealType } from "../types";
import type { SpoonacularRecipe } from "../app/api/recipes/route";
import { useMood } from "../context/MoodContext";
import { useGroceryOptional } from "../context/GroceryContext";
import { useUser } from "../context/UserContext";

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

const MealLibrary = ({ gentleMode = false }: { gentleMode?: boolean }) => {
    const { analysis, preference, setPreference, sustainMode } = useMood();
    const grocery = useGroceryOptional();
    const { user } = useUser();
    const userAllergies = user?.allergies ?? [];
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAllOverride, setShowAllOverride] = useState(false);

    // Spoonacular explore state
    const [exploreRecipes, setExploreRecipes] = useState<SpoonacularRecipe[]>([]);
    const [exploreLoading, setExploreLoading] = useState(false);
    const [exploreError, setExploreError] = useState(false);

    // Granular filter state
    const [showFilters, setShowFilters] = useState(false);
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

    const targetMoods = useMemo((): string[] => {
        if (!analysis) return [];
        if (sustainMode === "winddown") return ["calm", "relaxed", "grounding", "comforting"];
        if (sustainMode === "sustain") return [...analysis.recommendedMoods, "energetic", "happy", "light"];
        return analysis.recommendedMoods;
    }, [analysis, sustainMode]);

    const targetedNutrients = useMemo(() => analysis?.targetedNutrients ?? [], [analysis]);

    // Fetch Spoonacular recipes when targeted nutrients change
    useEffect(() => {
        if (targetedNutrients.length === 0) {
            setExploreRecipes([]);
            return;
        }
        let cancelled = false;
        setExploreLoading(true);
        setExploreError(false);

        fetch(`/api/recipes?nutrients=${encodeURIComponent(targetedNutrients.join(","))}`)
            .then(r => r.json())
            .then(data => {
                if (!cancelled) {
                    setExploreRecipes(data.recipes ?? []);
                    setExploreLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setExploreError(true);
                    setExploreLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [targetedNutrients.join(",")]);

    const sortedMeals = useMemo(() => {
        // Filter out meals containing user's allergens
        const allergenSafe = MEALS.filter(m => {
            if (userAllergies.length === 0) return true;
            const mealAllergens = m.allergens ?? [];
            return !userAllergies.some(a => mealAllergens.includes(a));
        });

        const byPreference = allergenSafe.filter((m) => m.preference === preference);

        const granularFiltered = byPreference.filter((m) => {
            if (cuisineFilter !== "all" && m.cuisine !== cuisineFilter) return false;
            if (dietFilter !== "all" && m.dietFocus !== dietFilter) return false;
            if (cookTimeFilter === "quick" && m.cookTime >= 20) return false;
            if (cookTimeFilter === "medium" && (m.cookTime < 20 || m.cookTime > 40)) return false;
            if (cookTimeFilter === "long" && m.cookTime <= 40) return false;
            if (mealTypeFilter !== "all" && m.mealType !== mealTypeFilter) return false;
            return true;
        });

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
                    const profileKeys = Object.keys(meal.nutrientProfile).map(k => k.toLowerCase());
                    nutrientMatches = targetedNutrients.filter(n =>
                        profileKeys.some(pk => pk.includes(n.toLowerCase()) || n.toLowerCase().includes(pk))
                    ).length;
                }

                const score = (moodTagMatches * 2) + nutrientMatches;
                return { ...meal, score, matched: moodTagMatches > 0 || nutrientMatches > 0 };
            })
            .sort((a, b) => b.score - a.score);
    }, [userAllergies, preference, cuisineFilter, dietFilter, cookTimeFilter, mealTypeFilter, analysis, targetMoods, targetedNutrients]);

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
                            ✨ Share how you're feeling above and we'll recommend the best meals for your mood.
                        </p>
                    </>
                )}

                <div className={styles.selector}>
                    {(["veg", "non-veg", "vegan"] as const).map((p) => (
                        <button
                            key={p}
                            className={`${styles.btn} ${preference === p ? styles.active : ""}`}
                            onClick={() => setPreference(p)}
                        >
                            {p === "veg" ? "🥗 Vegetarian" : p === "non-veg" ? "🍗 Non-Veg" : "🌱 Vegan"}
                        </button>
                    ))}
                </div>

                {/* More Filters toggle — hidden in gentle mode */}
                {!(gentleMode && !showAllOverride) && (
                <div className={styles.filterToggleRow}>
                    <button
                        className={`${styles.filterToggleBtn} ${showFilters ? styles.filterToggleBtnActive : ""}`}
                        onClick={() => setShowFilters(v => !v)}
                        aria-expanded={showFilters}
                    >
                        <span>⚙ More Filters</span>
                        {activeFilterCount > 0 && (
                            <span className={styles.filterCount}>{activeFilterCount}</span>
                        )}
                        <span className={styles.filterChevron}>{showFilters ? "▲" : "▼"}</span>
                    </button>
                    {activeFilterCount > 0 && (
                        <button className={styles.clearFiltersLink} onClick={clearFilters}>
                            Clear all filters
                        </button>
                    )}
                </div>
                )}

                {showFilters && !(gentleMode && !showAllOverride) && (
                    <div className={styles.filterPanel}>
                        <div className={styles.filterRow}>
                            <span className={styles.filterRowLabel}>Cuisine</span>
                            <div className={styles.chipRow}>
                                {CUISINE_OPTIONS.map(opt => (
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
                                {DIET_OPTIONS.map(opt => (
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
                                {COOK_TIME_OPTIONS.map(opt => (
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
                                {MEAL_TYPE_OPTIONS.map(opt => (
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
                )}

                {userAllergies.length > 0 && (
                    <p className={styles.filterNote}>
                        🛡️ Filtered for your dietary needs ({userAllergies.length} allergen{userAllergies.length !== 1 ? "s" : ""} excluded)
                    </p>
                )}

                {analysis && (
                    <p className={styles.filterNote}>
                        ✨ Showing meals matched to your mood. Highlighted ones are top picks for you.
                    </p>
                )}

                <div className={styles.grid}>
                    {(gentleMode && !showAllOverride ? sortedMeals.slice(0, 3) : sortedMeals).map((meal, idx) => {
                        const isExpanded = expandedId === meal.id || (gentleMode && !showAllOverride && idx === 0);
                        return (
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
                                <div className={styles.cardMeta}>
                                    <span className={styles.metaTag}>🕐 {meal.cookTime}m</span>
                                    <span className={styles.metaTag}>{meal.mealType}</span>
                                    <span className={styles.metaTag}>{meal.cuisine}</span>
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
                                    <span className={styles.calories}>{meal.calories} kcal</span>
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
                        Show all {sortedMeals.length} meals
                    </button>
                )}

                {/* Explore More — Spoonacular enrichment */}
                {analysis && !gentleMode && (exploreLoading || exploreRecipes.length > 0 || exploreError) && (
                    <div className={styles.exploreSection}>
                        <div className={styles.exploreHeader}>
                            <h3 className={styles.exploreTitle}>🧭 Explore More</h3>
                            <span className={styles.explorePowered}>Powered by Spoonacular</span>
                        </div>

                        {exploreLoading && (
                            <div className={styles.exploreGrid}>
                                {[1, 2, 3].map(i => (
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

                        {exploreError && !exploreLoading && (
                            <div className={styles.exploreEmpty}>
                                <p>Couldn&apos;t load extra recipes right now.</p>
                            </div>
                        )}

                        {!exploreLoading && !exploreError && exploreRecipes.length === 0 && (
                            <div className={styles.exploreEmpty}>
                                <p>🍴 No additional recipes found for these nutrients.</p>
                            </div>
                        )}

                        {!exploreLoading && exploreRecipes.length > 0 && (
                            <div className={styles.exploreGrid}>
                                {exploreRecipes.map(recipe => (
                                    <a
                                        key={recipe.id}
                                        href={recipe.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.exploreCard}
                                    >
                                        <div className={styles.exploreImgWrap}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={recipe.image}
                                                alt={recipe.title}
                                                className={styles.exploreImg}
                                            />
                                        </div>
                                        <div className={styles.exploreCardBody}>
                                            <h4 className={styles.exploreCardTitle}>{recipe.title}</h4>
                                            <div className={styles.exploreMeta}>
                                                <span>🕐 {recipe.readyInMinutes}m</span>
                                                {recipe.calories > 0 && <span>{recipe.calories} kcal</span>}
                                            </div>
                                            <div className={styles.exploreNutrients}>
                                                {recipe.nutrients.map(n => (
                                                    <span key={n} className={styles.nutrientBadge}>{n}</span>
                                                ))}
                                            </div>
                                            <span className={styles.exploreLink}>View Recipe ↗</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
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
