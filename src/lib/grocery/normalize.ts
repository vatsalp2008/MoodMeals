export const normalizeTextKey = (raw: string) => {
    return raw
        .toLowerCase()
        .replace(/\([^)]*\)/g, " ") // remove parenthetical qualifiers
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

export const prettyIngredientName = (normalizedKey: string) => {
    if (!normalizedKey) return "";
    return normalizedKey
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
};

export const extractDesiredNutrientCategories = (nutrientStrings: string[]) => {
    const categories = new Set<string>();
    for (const s of nutrientStrings) {
        const lower = s.toLowerCase();
        if (lower.includes("magnesium")) categories.add("magnesium");
        if (lower.includes("tryptophan")) categories.add("tryptophan");
        if (lower.includes("dha") || lower.includes("omega-3") || lower.includes("omega 3") || lower.includes("omega3")) categories.add("omega-3");
        if (lower.includes("fiber")) categories.add("fiber");
        if (lower.includes("protein")) categories.add("protein");
        if (lower.includes("iron")) categories.add("iron");
        if (lower.includes("carb")) categories.add("carbs");
        if (lower.includes("vitamin c")) categories.add("vitamin c");
        if (lower.includes("zinc")) categories.add("zinc");
        if (lower.includes("b-vitamin") || lower.includes("b vitamin") || lower.includes("b-vitamins") || lower.includes("b vitamins")) categories.add("b-vitamins");
    }
    return categories;
};

