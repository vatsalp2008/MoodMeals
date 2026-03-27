"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import styles from "./MealLibrary.module.css";
import { MEALS } from "../data/meals";
import type { Meal, MealCuisine, MealDietFocus, MealType, MealEffort } from "../types";
import { useMood } from "../context/MoodContext";
import { useStressCalendar } from "../context/StressCalendarContext";
import { useGroceryOptional } from "../context/GroceryContext";
import { usePantry } from "../context/PantryContext";
import { useUser } from "../context/UserContext";
import { BUDGET_ALTERNATIVES } from "../data/budgetTips";
import ShareToast from "./ShareToast";


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

/** Diet focus badge display config. */
function dietFocusBadge(focus: MealDietFocus): { emoji: string; label: string } {
    switch (focus) {
        case "protein-heavy": return { emoji: "\uD83D\uDCAA", label: "High Protein" };
        case "fiber-rich": return { emoji: "\uD83C\uDF3E", label: "Fiber Rich" };
        case "low-calorie": return { emoji: "\uD83C\uDF43", label: "Low Cal" };
        case "balanced": return { emoji: "\u2696\uFE0F", label: "Balanced" };
    }
}

/** Effort badge display config. */
function effortBadge(effort: MealEffort): { emoji: string; label: string } {
    switch (effort) {
        case "minimal": return { emoji: "\u26A1", label: "Quick" };
        case "easy": return { emoji: "\u26A1", label: "Quick" };
        case "moderate": return { emoji: "\uD83D\uDD50", label: "Moderate" };
        case "involved": return { emoji: "\uD83C\uDF72", label: "Slow Cook" };
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
    const { analysis, preference: moodPreference, sustainMode } = useMood();
    const { events: stressEvents } = useStressCalendar();
    const grocery = useGroceryOptional();
    const pantry = usePantry();
    const { user, profile } = useUser();

    // Preference: use profile-level preference (UserContext) with MoodContext as fallback
    const preference = profile?.preference ?? moodPreference;

    // Find stress events in the next 24 hours for contextual note
    const urgentStressEvents = useMemo(() => {
        const now = new Date();
        const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return stressEvents.filter((evt) => {
            const evtDate = new Date(evt.date + (evt.time ? `T${evt.time}` : "T09:00:00"));
            return evtDate > now && evtDate <= horizon;
        });
    }, [stressEvents]);

    // Hydration guard: avoid SSR/client mismatch for localStorage-backed state
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => { setHasMounted(true); }, []);

    const pantryHasItems = pantry.items.length > 0;
    const userAllergies = user?.allergies ?? [];
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const toggleExpanded = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const [showAllOverride, setShowAllOverride] = useState(false);

    // Gentle mode: filters start collapsed but user can toggle them open
    const [filtersExpanded, setFiltersExpanded] = useState(!gentleMode);

    // Dynamic API meals state
    const [apiMeals, setApiMeals] = useState<Meal[]>([]);
    const [apiLoading, setApiLoading] = useState(false);

    // Share toast state
    const [showShareToast, setShowShareToast] = useState(false);
    const dismissShareToast = useCallback(() => setShowShareToast(false), []);

    const handleShare = useCallback(async (meal: Meal) => {
        const shareUrl = window.location.origin + `/app?meal=${meal.id}`;
        const shareText = `Check out "${meal.name}" on MoodMeals${meal.whyThisMeal ? ` \u2014 ${meal.whyThisMeal.slice(0, 100)}` : ""}`;

        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: meal.name,
                    text: shareText,
                    url: shareUrl,
                });
                return;
            } catch {
                // User cancelled or share failed — fall through to clipboard
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
        } catch {
            // Clipboard API unavailable — do nothing
        }
    }, []);

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

    // Whether we are using curated fallback (API returned empty after loading)
    const usingCuratedFallback = apiMeals.length === 0 && !apiLoading && analysis !== null;

    // Base meal pool: API meals (if available) or curated meals filtered by allergens/preference
    const combinedMeals = useMemo(() => {
        // If API returned meals, use ONLY those — do not mix with curated
        if (apiMeals.length > 0) return apiMeals;

        // Fallback: curated meals filtered by allergens/preference
        return MEALS.filter((m) => {
            if (userAllergies.length > 0) {
                const mealAllergens = m.allergens ?? [];
                if (userAllergies.some((a) => mealAllergens.includes(a))) return false;
            }
            if (preference === "non-veg") return true;
            if (preference === "veg") return m.preference === "veg" || m.preference === "vegan";
            return m.preference === "vegan";
        });
    }, [userAllergies, preference, apiMeals]);

    // Available filter values — derived from the unfiltered meal pool
    const availableCuisines = useMemo(() => {
        const set = new Set(combinedMeals.map((m) => m.cuisine));
        return CUISINE_OPTIONS.filter((opt) => opt.value === "all" || set.has(opt.value as MealCuisine));
    }, [combinedMeals]);

    const availableDietFocus = useMemo(() => {
        const set = new Set(combinedMeals.map((m) => m.dietFocus));
        return DIET_OPTIONS.filter((opt) => opt.value === "all" || set.has(opt.value as MealDietFocus));
    }, [combinedMeals]);

    const availableCookTimes = useMemo(() => {
        let hasQuick = false, hasMedium = false, hasLong = false;
        for (const m of combinedMeals) {
            if (m.cookTime < 20) hasQuick = true;
            else if (m.cookTime <= 40) hasMedium = true;
            else hasLong = true;
        }
        return COOK_TIME_OPTIONS.filter((opt) => {
            if (opt.value === "all") return true;
            if (opt.value === "quick") return hasQuick;
            if (opt.value === "medium") return hasMedium;
            if (opt.value === "long") return hasLong;
            return false;
        });
    }, [combinedMeals]);

    const availableMealTypes = useMemo(() => {
        const set = new Set(combinedMeals.map((m) => m.mealType));
        return MEAL_TYPE_OPTIONS.filter((opt) => opt.value === "all" || set.has(opt.value as MealType));
    }, [combinedMeals]);

    // Combine API meals + curated meals, filter and score
    const sortedMeals = useMemo(() => {
        const combined = combinedMeals;

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
    }, [combinedMeals, cuisineFilter, dietFilter, cookTimeFilter, mealTypeFilter, analysis, targetMoods, targetedNutrients, lowFrictionActive]);

    const apiMealCount = sortedMeals.filter((m) => isApiMeal(m)).length;

    // Feature 3: Deduplicate "Why this meal?" when text is identical across 3+ meals
    const sharedWhyText = useMemo(() => {
        if (sortedMeals.length < 3) return null;
        const first = sortedMeals[0]?.whyThisMeal;
        if (!first) return null;
        const checkCount = Math.min(sortedMeals.length, 6);
        const allSame = sortedMeals.slice(0, checkCount).every(
            (m) => m.whyThisMeal === first,
        );
        return allSame ? first : null;
    }, [sortedMeals]);

    return (
        <section id="recipes" className={styles.section}>
            <div className="container">
                {/* Analysis result or welcome empty state */}
                {hasMounted && analysis ? (
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
                        {urgentStressEvents.length > 0 && (
                            <div className={styles.eventContextNote}>
                                <span className={styles.eventContextIcon}>&#127919;</span>
                                <span>
                                    Your meals are optimized for your upcoming{" "}
                                    {urgentStressEvents.map((evt, i) => (
                                        <strong key={evt.id}>
                                            {evt.title}
                                            {i < urgentStressEvents.length - 1 ? ", " : ""}
                                        </strong>
                                    ))}{" "}
                                    {urgentStressEvents.length === 1 ? "tomorrow" : "coming up soon"}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.welcomeEmpty}>
                        <span className={styles.welcomeIcon}>🍽️</span>
                        <h2 className={styles.welcomeHeading}>How are you feeling today?</h2>
                        <p className={styles.welcomeSubtext}>
                            Tell us your mood above &mdash; we&apos;ll match you with meals that support how you feel, backed by nutritional science.
                        </p>
                        <div className={styles.suggestionChips}>
                            <a href="#mood-input" className={styles.suggestionChip}>I&apos;m stressed about exams</a>
                            <a href="#mood-input" className={styles.suggestionChip}>Feeling tired and need energy</a>
                            <a href="#mood-input" className={styles.suggestionChip}>Happy and want something light</a>
                        </div>
                    </div>
                )}

                {/* Filter bar — always visible; collapsed initially in gentle mode */}
                <div className={styles.filterBar}>
                    <div className={styles.filterBarHeader}>
                        <span className={styles.filterBarTitle}>
                            Filters
                            {activeFilterCount > 0 && (
                                <span className={styles.filterCount}>{activeFilterCount}</span>
                            )}
                        </span>
                        <div className={styles.filterBarActions}>
                            {activeFilterCount > 0 && (
                                <button className={styles.clearFiltersLink} onClick={clearFilters}>
                                    Clear all filters
                                </button>
                            )}
                            {gentleMode && (
                                <button
                                    className={styles.filterToggleBtn}
                                    onClick={() => setFiltersExpanded((prev) => !prev)}
                                    aria-expanded={filtersExpanded}
                                >
                                    {filtersExpanded ? "Hide filters" : "Show filters"}
                                </button>
                            )}
                        </div>
                    </div>

                    {(!gentleMode || filtersExpanded) && (
                        <div className={styles.filterGrid}>
                            <div className={styles.filterRow}>
                                <span className={styles.filterRowLabel}>Cuisine</span>
                                <div className={styles.chipRow}>
                                    {availableCuisines.map((opt) => (
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
                                    {availableDietFocus.map((opt) => (
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
                                    {availableCookTimes.map((opt) => (
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
                                    {availableMealTypes.map((opt) => (
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
                </div>

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

                {usingCuratedFallback && targetedNutrients.length > 0 && (
                    <p className={styles.curatedFallbackNote}>
                        Showing curated recommendations (personalized results temporarily unavailable)
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

                {/* Empty filters fallback — only when analysis exists but filters exclude everything */}
                {analysis && sortedMeals.length === 0 && !apiLoading && (
                    <div className={styles.emptyFilters}>
                        <span className={styles.emptyFiltersIcon}>🔍</span>
                        <h3 className={styles.emptyFiltersHeading}>No meals match your filters</h3>
                        <p className={styles.emptyFiltersText}>
                            Try adjusting your filters or clearing them to see more options.
                        </p>
                        {activeFilterCount > 0 && (
                            <button className={styles.emptyFiltersClear} onClick={clearFilters}>
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Feature 3: Shared "Why this meal?" banner when text is identical across cards */}
                {sharedWhyText && (
                    <div className={styles.sharedWhyBanner}>
                        <div className={styles.sharedWhyLabel}>Why these meals?</div>
                        <p className={styles.sharedWhyText}>{sharedWhyText}</p>
                    </div>
                )}

                {/* Only show meal grid when user has entered their mood */}
                {analysis && <div className={styles.grid}>
                    {(gentleMode && !showAllOverride ? sortedMeals.slice(0, 3) : sortedMeals).map((meal, idx) => {
                        const isExpanded = expandedIds.has(meal.id) || (gentleMode && !showAllOverride && idx === 0);
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
                                    <div className={styles.cardTitleRow}>
                                        <h3 className={styles.cardTitle}>{meal.name}</h3>
                                        <button
                                            className={styles.shareBtn}
                                            onClick={() => handleShare(meal)}
                                            aria-label={`Share ${meal.name}`}
                                            title="Share recipe"
                                        >
                                            <svg
                                                className={styles.shareIcon}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                                <polyline points="16 6 12 2 8 6" />
                                                <line x1="12" y1="2" x2="12" y2="15" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Pantry availability badge */}
                                    {pantryHasItems && meal.ingredients && meal.ingredients.length > 0 && (() => {
                                        const total = meal.ingredients.length;
                                        let availableCount = 0;
                                        let partialCount = 0;
                                        for (const ing of meal.ingredients) {
                                            const status = pantry.getItemStatus(ing.name);
                                            if (status === "available") availableCount++;
                                            else if (status === "partial") partialCount++;
                                        }
                                        const inPantryCount = availableCount + partialCount;
                                        if (availableCount === total) {
                                            return (
                                                <span className={`${styles.pantryBadge} ${styles.pantryBadgeFull}`}>
                                                    ✓ All ingredients available
                                                </span>
                                            );
                                        }
                                        if (inPantryCount > 0) {
                                            return (
                                                <span className={`${styles.pantryBadge} ${styles.pantryBadgePartial}`}>
                                                    {availableCount}/{total} available{partialCount > 0 ? `, ${partialCount} low` : ""}
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
                                                    const ingStatus = pantryHasItems ? pantry.getItemStatus(ing.name) : "none";
                                                    return (
                                                        <span key={ing.name}>
                                                            <span
                                                                className={
                                                                    ingStatus === "available" ? styles.ingredientInPantry
                                                                    : ingStatus === "partial" ? styles.ingredientLowPantry
                                                                    : ""
                                                                }
                                                                title={ing.amount || undefined}
                                                            >
                                                                {ingStatus === "available" && "✓ "}
                                                                {ingStatus === "partial" && "⚠ "}
                                                                {ing.name},
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
                                        {(() => {
                                            const dfBadge = dietFocusBadge(meal.dietFocus);
                                            return (
                                                <span className={`${styles.metaTag} ${styles.dietFocus} ${styles[`diet-${meal.dietFocus}`]}`}>
                                                    {dfBadge.emoji} {dfBadge.label}
                                                </span>
                                            );
                                        })()}
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
                                        <span className={styles.calories} title="Daily Value: recommended daily intake based on a 2,000-calorie diet">
                                            {meal.calories} kcal
                                            <span className={styles.caloriesPct}>{Math.round((meal.calories / 2000) * 100)}% DV</span>
                                        </span>
                                    </div>

                                    {/* Feature 3: Hide per-card "Why this meal?" when shared banner is shown */}
                                    {!sharedWhyText && (
                                        <button
                                            className={styles.whyToggle}
                                            onClick={() => toggleExpanded(meal.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            <span>Why this meal?</span>
                                            <span className={styles.whyChevron}>
                                                {isExpanded ? "▲" : "▼"}
                                            </span>
                                        </button>
                                    )}

                                    {!sharedWhyText && isExpanded && (
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

                                    {/* Feature 5: Prominent CTA on the first meal only */}
                                    {idx === 0 && analysis && grocery && (
                                        <button
                                            className={`${styles.tryMealBtn} ${grocery.hasMeal(meal.id) ? styles.tryMealBtnAdded : ""}`}
                                            onClick={() =>
                                                grocery.hasMeal(meal.id)
                                                    ? grocery.removeMeal(meal.id)
                                                    : grocery.addMeal(meal)
                                            }
                                        >
                                            {grocery.hasMeal(meal.id) ? "✓ Top Pick Added" : "🛒 Add Top Pick to Grocery"}
                                        </button>
                                    )}

                                    {/* Regular "Add to Grocery" for all other cards (or first card when no analysis) */}
                                    {grocery && !(idx === 0 && analysis) && (
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
                </div>}

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

            <ShareToast visible={showShareToast} onDismiss={dismissShareToast} />
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
