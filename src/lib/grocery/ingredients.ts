import { Meal } from "../../types";
import { normalizeTextKey } from "./normalize";

export const getMealIngredientsForMoodTags = (meal: Meal, moodTags: string[] | null | undefined) => {
    // Prefer mood-specific ingredients if moodTags are provided.
    if (moodTags && moodTags.length) {
        const fromMoodTags = moodTags.flatMap((tag) => meal.ingredientsByMood[tag] ?? []);
        if (fromMoodTags.length) return Array.from(new Set(fromMoodTags));
    }

    // Fallback: union of all ingredient variants.
    return Array.from(new Set(Object.values(meal.ingredientsByMood).flat()));
};

export const normalizeIngredientKey = (ingredientName: string) => {
    return normalizeTextKey(ingredientName);
};

