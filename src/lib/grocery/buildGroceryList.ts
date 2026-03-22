import { Meal } from "../../types";
import { INGREDIENT_CATALOG } from "../../data/ingredientCatalog";
import { extractDesiredNutrientCategories, normalizeTextKey, prettyIngredientName } from "./normalize";
import { getMealIngredientsForMoodTags } from "./ingredients";

export type GroceryListItem = {
    key: string;
    name: string;
    cost: number;
    nutrientScore: number;
};

export type GrocerySubstitution = {
    from: string;
    to: string;
};

export type BuiltGroceryList = {
    items: GroceryListItem[];
    totalCost: number;
    budget: number;
    substitutions: GrocerySubstitution[];
    note: string;
};

export const buildGroceryList = (args: {
    meals: Meal[];
    pantryItems: string[];
    budget: number;
    moodTags: string[];
}) => {
    const { meals, pantryItems, budget, moodTags } = args;

    const pantrySet = new Set(pantryItems.map((p) => normalizeTextKey(p)));
    const desiredNutrientsRaw = new Set<string>();

    for (const meal of meals) {
        for (const tag of moodTags) {
            const nutrients = meal.nutrientsByMood[tag];
            if (nutrients?.length) {
                for (const n of nutrients) desiredNutrientsRaw.add(n);
            }
        }
    }

    const desiredCategories = extractDesiredNutrientCategories(Array.from(desiredNutrientsRaw));

    // Collect ingredients needed for recommended meals.
    const neededIngredientKeys = new Set<string>();
    for (const meal of meals) {
        const ingredients = getMealIngredientsForMoodTags(meal, moodTags);
        for (const ing of ingredients) {
            const key = normalizeTextKey(ing);
            if (!key) continue;
            if (pantrySet.has(key)) continue;
            neededIngredientKeys.add(key);
        }
    }

    const neededKeys = Array.from(neededIngredientKeys);

    const toItem = (ingredientKey: string): { key: string; cost: number; categories: string[]; nutrientScore: number } => {
        const info = INGREDIENT_CATALOG[ingredientKey];
        const cost = info?.cost ?? 3.0;
        const categories = (info?.categories ?? []) as unknown as string[];
        const nutrientScore = desiredCategories.size
            ? categories.reduce((acc, c) => (desiredCategories.has(c) ? acc + 1 : acc), 0)
            : 0;
        return { key: ingredientKey, cost, categories, nutrientScore };
    };

    const candidateItems = neededKeys.map(toItem);
    const sorted = candidateItems.sort((a, b) => {
        if (b.nutrientScore !== a.nutrientScore) return b.nutrientScore - a.nutrientScore;
        return a.cost - b.cost;
    });

    let totalCost = 0;
    const selectedKeys = new Set<string>();
    const excluded: string[] = [];

    const safeBudget = Number.isFinite(budget) ? Math.max(0, budget) : 0;

    for (const item of sorted) {
        if (selectedKeys.has(item.key)) continue;
        if (totalCost + item.cost <= safeBudget) {
            selectedKeys.add(item.key);
            totalCost += item.cost;
        } else {
            excluded.push(item.key);
        }
    }

    const substitutions: GrocerySubstitution[] = [];

    // Nutrient-first substitution: try to replace excluded ingredients with cheaper substitutes
    // that better match the user's desired nutrient categories.
    let remainingBudget = safeBudget - totalCost;
    if (remainingBudget > 0) {
        const excludedSorted = excluded
            .map((k) => toItem(k))
            .sort((a, b) => b.nutrientScore - a.nutrientScore || a.cost - b.cost);

        for (const ex of excludedSorted) {
            const info = INGREDIENT_CATALOG[ex.key];
            const substitutes = info?.substitutes ?? [];

            // Prefer substitutes that are still nutrient-relevant.
            const substituteSorted = substitutes
                .map((s) => normalizeTextKey(s))
                .filter(Boolean)
                .filter((k) => !pantrySet.has(k) && !selectedKeys.has(k))
                .map((k) => toItem(k))
                .sort((a, b) => b.nutrientScore - a.nutrientScore || a.cost - b.cost);

            for (const sub of substituteSorted) {
                if (sub.cost > safeBudget) continue;
                if (sub.cost <= remainingBudget) {
                    selectedKeys.add(sub.key);
                    totalCost += sub.cost;
                    remainingBudget -= sub.cost;
                    substitutions.push({
                        from: ex.key,
                        to: sub.key,
                    });
                    break;
                }
            }
        }
    }

    const selectedItems = Array.from(selectedKeys).map((key) => {
        const item = toItem(key);
        return {
            key,
            name: prettyIngredientName(key),
            cost: item.cost,
            nutrientScore: item.nutrientScore,
        };
    });

    const note =
        safeBudget <= 0
            ? "Set a budget to generate a prioritized grocery list."
            : neededKeys.length === 0
              ? "You already have the pantry items needed for your recommendations."
              : substitutions.length
                ? "Budget exceeded, so we prioritized nutrient-first items and applied substitutions."
                : totalCost >= safeBudget - 0.001 && excluded.length
                  ? "Budget reached, so we prioritized nutrient-first items."
                  : "Generated a pantry-aware grocery list within your budget.";

    return {
        items: selectedItems.sort((a, b) => b.nutrientScore - a.nutrientScore || a.cost - b.cost),
        totalCost,
        budget: safeBudget,
        substitutions,
        note,
    } satisfies BuiltGroceryList;
};

