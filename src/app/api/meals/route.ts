import { NextRequest, NextResponse } from "next/server";
import type { Meal, MealPreference, AllergyType, MealCuisine, MealDietFocus, MealType, Ingredient } from "@/types";
import { USDA_NUTRIENT_MAP, USDA_ID_TO_KEY } from "@/data/usda-nutrients";
import { MEALS as CURATED_MEALS } from "@/data/meals";

// ── Nutrient benefit knowledge base (from nutritional psychiatry research) ──

const NUTRIENT_BENEFITS: Record<string, { benefit: string; mechanism: string }> = {
    magnesium: {
        benefit: "stress reduction",
        mechanism: "regulates cortisol and activates GABA receptors, the brain's primary calming neurotransmitter",
    },
    iron: {
        benefit: "energy and mental clarity",
        mechanism: "supports oxygen transport to the brain and is essential for dopamine synthesis",
    },
    zinc: {
        benefit: "focus and emotional stability",
        mechanism: "regulates glutamate signaling — low zinc is directly linked to anxiety and attention difficulties",
    },
    "vitamin-b6": {
        benefit: "mood balance",
        mechanism: "acts as a co-enzyme in converting tryptophan to serotonin and producing GABA",
    },
    "vitamin-b12": {
        benefit: "cognitive function",
        mechanism: "supports the myelin sheath that protects neural pathways for clear thinking",
    },
    "vitamin-c": {
        benefit: "mood resilience",
        mechanism: "is a required co-factor in serotonin synthesis and helps neutralize stress-induced oxidative damage",
    },
    "vitamin-d": {
        benefit: "mood elevation",
        mechanism: "activates genes that synthesize serotonin in the brain",
    },
    "vitamin-e": {
        benefit: "neuroprotection",
        mechanism: "protects brain cell membranes from oxidative stress caused by chronic pressure",
    },
    folate: {
        benefit: "emotional resilience",
        mechanism: "is essential for synthesizing both serotonin and dopamine — deficiency doubles depression risk",
    },
    tryptophan: {
        benefit: "mood lift",
        mechanism: "is the direct precursor to serotonin, your brain's primary mood-stabilizing neurotransmitter",
    },
    dha: {
        benefit: "brain health",
        mechanism: "is the primary structural fat in brain cell membranes — clinical trials show it reduces depressive symptoms",
    },
    polyphenols: {
        benefit: "sustained positive mood",
        mechanism: "reduces neuroinflammation and supports gut bacteria that produce 95% of the body's serotonin",
    },
};

// ── Mappings ──

const PREFERENCE_TO_DIET: Record<MealPreference, string> = {
    veg: "vegetarian",
    "non-veg": "",
    vegan: "vegan",
};

const ALLERGY_TO_INTOLERANCE: Record<AllergyType, string> = {
    gluten: "gluten",
    dairy: "dairy",
    nuts: "tree nut",
    shellfish: "shellfish",
    soy: "soy",
    fish: "seafood",
    eggs: "egg",
    sesame: "sesame",
};

const NUTRIENT_PARAM_MAP: Record<string, { param: string; minValue: string }> = {
    magnesium: { param: "minMagnesium", minValue: "80" },
    iron: { param: "minIron", minValue: "5" },
    zinc: { param: "minZinc", minValue: "4" },
    "vitamin-b6": { param: "minVitaminB6", minValue: "0.5" },
    "vitamin-b12": { param: "minVitaminB12", minValue: "2" },
    "vitamin-c": { param: "minVitaminC", minValue: "30" },
    "vitamin-d": { param: "minVitaminD", minValue: "5" },
    "vitamin-e": { param: "minVitaminE", minValue: "2" },
    folate: { param: "minFolate", minValue: "100" },
    tryptophan: { param: "minProtein", minValue: "25" },
    dha: { param: "minFat", minValue: "10" },
    polyphenols: { param: "minFiber", minValue: "5" },
};

const CLINICAL_QUERY: Record<string, string> = {
    "high-stress": "calming comfort food magnesium",
    "cognitive-fatigue": "brain food iron omega",
    depressive: "mood boosting serotonin",
    "poor-focus": "brain food concentration",
    burnout: "antioxidant recovery",
};

const CLINICAL_SORT: Record<string, string> = {
    "high-stress": "healthiness",
    "cognitive-fatigue": "max-used-ingredients",
    depressive: "popularity",
    "poor-focus": "healthiness",
    burnout: "max-used-ingredients",
};

const CLINICAL_MOOD_TAGS: Record<string, string[]> = {
    "high-stress": ["calm", "relaxed", "grounding", "comforting"],
    "cognitive-fatigue": ["energetic", "focused", "comforting"],
    depressive: ["comforting", "happy", "light"],
    "poor-focus": ["focused", "light", "energetic"],
    burnout: ["light", "happy", "energetic"],
};

const CLINICAL_GOAL: Record<string, string> = {
    "high-stress": "manage your stress response",
    "cognitive-fatigue": "restore your mental energy",
    depressive: "support your mood naturally",
    "poor-focus": "sharpen your concentration",
    burnout: "sustain your positive energy",
};

// ── Spoonacular nutrient name → our nutrient key ──

const SPOON_NUTRIENT_ALIAS: Record<string, string> = {
    calories: "calories",
    protein: "protein",
    fat: "fat",
    fiber: "fiber",
    "vitamin b6": "vitamin-b6",
    "vitamin b12": "vitamin-b12",
    "vitamin c": "vitamin-c",
    "vitamin d": "vitamin-d",
    "vitamin e": "vitamin-e",
    "vitamin a": "vitamin-a",
    "vitamin k": "vitamin-k",
    magnesium: "magnesium",
    iron: "iron",
    zinc: "zinc",
    folate: "folate",
    potassium: "potassium",
    calcium: "calcium",
    selenium: "selenium",
};

// ── "Why this meal?" generator ──

function generateWhyThisMeal(
    nutrients: { name: string; amount: number; unit: string }[],
    targetedNutrients: string[],
    clinicalState: string,
): string {
    const relevant: { nutrient: string; amount: number; unit: string; info: (typeof NUTRIENT_BENEFITS)[string] }[] = [];

    for (const tn of targetedNutrients) {
        const info = NUTRIENT_BENEFITS[tn.toLowerCase()];
        if (!info) continue;

        const found = nutrients.find(
            (n) =>
                n.name.toLowerCase().includes(tn.toLowerCase().replace("-", " ")) ||
                tn.toLowerCase().replace("-", " ").includes(n.name.toLowerCase()),
        );

        if (found && found.amount > 0) {
            relevant.push({ nutrient: tn, amount: found.amount, unit: found.unit, info });
        } else {
            relevant.push({ nutrient: tn, amount: 0, unit: "", info });
        }
    }

    if (relevant.length === 0) {
        return "This nutrient-dense meal supports your overall wellbeing with a balanced profile of vitamins and minerals.";
    }

    const parts = relevant.slice(0, 3).map((r) => {
        const name = r.nutrient.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
        if (r.amount > 0) {
            return `${name} (${Math.round(r.amount)}${r.unit}) ${r.info.mechanism}`;
        }
        return `${name} in this recipe ${r.info.mechanism}`;
    });

    const goal = CLINICAL_GOAL[clinicalState] || "support your wellbeing";

    return `This meal can help ${goal}. ${parts.join(". ")}.`;
}

// ── Spoonacular response types ──

interface SpoonNutrient {
    name: string;
    amount: number;
    unit: string;
    percentOfDailyNeeds: number;
}

interface SpoonIngredient {
    name: string;
    original: string;
    amount: number;
    unit: string;
    aisle: string;
}

interface SpoonResult {
    id: number;
    title: string;
    image: string;
    readyInMinutes: number;
    sourceUrl: string;
    cuisines: string[];
    dishTypes: string[];
    dairyFree: boolean;
    glutenFree: boolean;
    summary: string;
    nutrition?: { nutrients: SpoonNutrient[] };
    extendedIngredients?: SpoonIngredient[];
}

// ── Helpers ──

function mapCuisine(cuisines: string[]): MealCuisine {
    const MAP: Record<string, MealCuisine> = {
        indian: "Indian",
        mediterranean: "Mediterranean",
        asian: "Asian",
        chinese: "Asian",
        japanese: "Asian",
        thai: "Asian",
        korean: "Asian",
        vietnamese: "Asian",
        mexican: "Mexican",
        latin: "Mexican",
        american: "American",
    };
    for (const c of cuisines) {
        const m = MAP[c.toLowerCase()];
        if (m) return m;
    }
    return "Fusion";
}

function mapMealType(dishTypes: string[]): MealType {
    for (const d of dishTypes) {
        const dl = d.toLowerCase();
        if (dl.includes("breakfast") || dl.includes("morning")) return "breakfast";
        if (dl.includes("lunch") || dl.includes("salad") || dl.includes("soup")) return "lunch";
        if (dl.includes("snack") || dl.includes("dessert") || dl.includes("appetizer")) return "snack";
    }
    return "dinner";
}

function mapDietFocus(nutrients: SpoonNutrient[]): MealDietFocus {
    const protein = nutrients.find((n) => n.name === "Protein")?.amount ?? 0;
    const fiber = nutrients.find((n) => n.name === "Fiber")?.amount ?? 0;
    const calories = nutrients.find((n) => n.name === "Calories")?.amount ?? 999;
    if (protein > 25) return "protein-heavy";
    if (fiber > 8) return "fiber-rich";
    if (calories < 300) return "low-calorie";
    return "balanced";
}

function mapIngredientCategory(aisle: string): Ingredient["category"] {
    const a = aisle.toLowerCase();
    if (a.includes("meat") || a.includes("seafood") || a.includes("protein") || a.includes("tofu")) return "protein";
    if (a.includes("produce") || a.includes("vegetable") || a.includes("fruit")) return "vegetable";
    if (a.includes("grain") || a.includes("bread") || a.includes("pasta") || a.includes("rice") || a.includes("cereal"))
        return "grain";
    if (a.includes("dairy") || a.includes("cheese") || a.includes("milk")) return "dairy";
    if (a.includes("spice") || a.includes("seasoning") || a.includes("herb")) return "spice";
    return "other";
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
}

// ── USDA FoodData Central enrichment ──

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

function getUSDAKey(): string {
    return process.env.USDA_API_KEY || "DEMO_KEY";
}

async function fetchUSDANutrients(ingredientName: string): Promise<Record<string, number>> {
    const params = new URLSearchParams({
        api_key: getUSDAKey(),
        query: ingredientName,
        pageSize: "1",
        dataType: "SR Legacy,Foundation",
    });

    try {
        const res = await fetch(`${USDA_BASE}/foods/search?${params}`, {
            next: { revalidate: 86400 }, // Cache 24h
        });
        if (!res.ok) return {};

        const data = await res.json();
        if (!data.foods?.length) return {};

        const profile: Record<string, number> = {};
        for (const fn of data.foods[0].foodNutrients) {
            const key = USDA_ID_TO_KEY[fn.nutrientId];
            if (key) profile[key] = fn.value;
        }
        return profile;
    } catch {
        return {};
    }
}

async function enrichMealWithUSDA(
    meal: Meal,
    targetedNutrients: string[],
): Promise<Meal> {
    const ingredientNames = meal.ingredients.slice(0, 3).map((i) => i.name);
    if (ingredientNames.length === 0) return meal;

    const usdaResults = await Promise.all(ingredientNames.map(fetchUSDANutrients));

    const enriched: Record<string, number> = { ...(meal.nutrientProfile ?? {}) };
    for (const key of targetedNutrients) {
        for (const result of usdaResults) {
            if (result[key] && result[key] > (enriched[key] ?? 0)) {
                enriched[key] = Math.round(result[key] * 100) / 100;
            }
        }
    }

    return {
        ...meal,
        nutrientProfile: enriched,
        dataSource: Object.keys(enriched).length > Object.keys(meal.nutrientProfile ?? {}).length ? "hybrid" : "spoonacular",
    };
}

// ── Curated fallback ──

function getCuratedFallback(
    preference: MealPreference,
    allergyList: AllergyType[],
    clinicalState: string,
): Meal[] {
    const moodTags = CLINICAL_MOOD_TAGS[clinicalState] ?? ["balanced"];

    return CURATED_MEALS.filter((m) => {
        // Preference filter (non-exclusive)
        if (preference === "vegan" && m.preference !== "vegan") return false;
        if (preference === "veg" && m.preference !== "veg" && m.preference !== "vegan") return false;
        // Allergy filter
        if (allergyList.length > 0) {
            const mealAllergens = m.allergens ?? [];
            if (allergyList.some((a) => mealAllergens.includes(a))) return false;
        }
        return true;
    }).map((m) => ({
        ...m,
        moodSync: m.moodSync.some((tag) => moodTags.includes(tag)) ? m.moodSync : [...m.moodSync, ...moodTags.slice(0, 1)],
        dataSource: "curated" as const,
    })).sort((a, b) => {
        const aScore = a.moodSync.filter((tag) => moodTags.includes(tag)).length;
        const bScore = b.moodSync.filter((tag) => moodTags.includes(tag)).length;
        return bScore - aScore;
    });
}

// ── Route handler ──

const apiKey = process.env.SPOONACULAR_API_KEY;

export async function GET(req: NextRequest) {
    const nutrients = req.nextUrl.searchParams.get("nutrients");
    const preference = (req.nextUrl.searchParams.get("preference") ?? "veg") as MealPreference;
    const allergies = req.nextUrl.searchParams.get("allergies");
    const clinicalState = req.nextUrl.searchParams.get("clinicalState") ?? "";
    const allergyList = allergies ? (allergies.split(",").map((a) => a.trim()) as AllergyType[]) : [];

    if (!apiKey) {
        return NextResponse.json({ meals: getCuratedFallback(preference, allergyList, clinicalState), source: "curated", fallback: true });
    }

    if (!nutrients) {
        return NextResponse.json({ error: "nutrients param required" }, { status: 400 });
    }

    const nutrientList = nutrients.split(",").map((n) => n.trim().toLowerCase());

    // Build Spoonacular query
    const params = new URLSearchParams({
        apiKey,
        number: "20",
        addRecipeNutrition: "true",
        addRecipeInformation: "true",
        fillIngredients: "true",
        sort: CLINICAL_SORT[clinicalState] ?? "healthiness",
        sortDirection: "desc",
        instructionsRequired: "true",
    });

    // Add mood-specific search query for more relevant results
    const moodQuery = CLINICAL_QUERY[clinicalState];
    if (moodQuery) params.set("query", moodQuery);

    const diet = PREFERENCE_TO_DIET[preference];
    if (diet) params.set("diet", diet);

    const intolerances = allergyList.map((a) => ALLERGY_TO_INTOLERANCE[a]).filter(Boolean);
    if (intolerances.length > 0) params.set("intolerances", intolerances.join(","));

    for (const n of nutrientList) {
        const mapping = NUTRIENT_PARAM_MAP[n];
        if (mapping) params.set(mapping.param, mapping.minValue);
    }

    try {
        const url = `https://api.spoonacular.com/recipes/complexSearch?${params}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.warn(`[meals] Spoonacular returned ${res.status}: ${body.slice(0, 200)}`);
            return NextResponse.json({ meals: getCuratedFallback(preference, allergyList, clinicalState), source: "curated", fallback: true });
        }

        const data = await res.json();
        const results: SpoonResult[] = data.results ?? [];
        const moodTags = CLINICAL_MOOD_TAGS[clinicalState] ?? ["balanced"];

        const meals: Meal[] = results.map((r) => {
            const allNutrients = r.nutrition?.nutrients ?? [];
            const calories = Math.round(allNutrients.find((n) => n.name === "Calories")?.amount ?? 0);

            // Display nutrients: top relevant ones the user's mood needs
            const displayNutrients = nutrientList
                .map((tn) => {
                    const found = allNutrients.find(
                        (n) =>
                            n.name.toLowerCase().includes(tn.replace("-", " ")) ||
                            tn.replace("-", " ").includes(n.name.toLowerCase()),
                    );
                    if (found && found.amount > 0) {
                        return { label: found.name, value: `${Math.round(found.amount)}${found.unit}` };
                    }
                    return null;
                })
                .filter((x): x is { label: string; value: string } => x !== null)
                .slice(0, 3);

            // Full nutrient profile
            const nutrientProfile: Record<string, number> = {};
            for (const n of allNutrients) {
                const key = SPOON_NUTRIENT_ALIAS[n.name.toLowerCase()] ?? n.name.toLowerCase().replace(/ /g, "-");
                nutrientProfile[key] = n.amount;
            }

            // Ingredients
            const ingredients: Ingredient[] = (r.extendedIngredients ?? []).slice(0, 10).map((ing) => ({
                name: ing.name,
                amount: ing.original,
                category: mapIngredientCategory(ing.aisle ?? ""),
            }));

            // Allergens (from Spoonacular flags)
            const allergens: AllergyType[] = [];
            if (r.dairyFree === false) allergens.push("dairy");
            if (r.glutenFree === false) allergens.push("gluten");

            // Description from summary
            const rawSummary = stripHtml(r.summary ?? "");
            const description =
                rawSummary.length > 120 ? rawSummary.slice(0, 117) + "..." : rawSummary || "A nutritious recipe matched to your mood.";

            return {
                id: `spoon-${r.id}`,
                name: r.title,
                description,
                preference,
                moodSync: moodTags,
                image:
                    r.image ?? "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
                calories,
                nutrients:
                    displayNutrients.length > 0 ? displayNutrients : [{ label: "Calories", value: `${calories} kcal` }],
                whyThisMeal: generateWhyThisMeal(allNutrients, nutrientList, clinicalState),
                ingredients,
                cuisine: mapCuisine(r.cuisines ?? []),
                dietFocus: mapDietFocus(allNutrients),
                cookTime: r.readyInMinutes ?? 30,
                mealType: mapMealType(r.dishTypes ?? []),
                nutrientProfile,
                allergens,
                sourceUrl: r.sourceUrl ?? `https://spoonacular.com/recipes/${r.id}`,
            };
        });

        // USDA enrichment pass — enrich top meals with precise micronutrient data
        let enrichedMeals = meals;
        try {
            enrichedMeals = await Promise.all(
                meals.map((m) => enrichMealWithUSDA(m, nutrientList))
            );
        } catch {
            console.warn("[meals] USDA enrichment failed, using Spoonacular-only data");
        }

        const hasHybrid = enrichedMeals.some((m) => m.dataSource === "hybrid");
        return NextResponse.json({
            meals: enrichedMeals,
            source: hasHybrid ? "hybrid" : "spoonacular",
            fallback: false,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[meals] Spoonacular fetch failed:", message);
        return NextResponse.json({ meals: getCuratedFallback(preference, allergyList, clinicalState), source: "curated", fallback: true });
    }
}
