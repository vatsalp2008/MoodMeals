export type IngredientCategory =
    | "magnesium"
    | "tryptophan"
    | "omega-3"
    | "fiber"
    | "protein"
    | "iron"
    | "carbs"
    | "vitamin c"
    | "zinc"
    | "b-vitamins";

export type IngredientInfo = {
    // Approximate cost in USD for a single planned grocery unit.
    cost: number;
    // Nutrient categories used for nutrient-first prioritization.
    categories: IngredientCategory[];
    // Optional cheaper alternatives that still cover some nutrient categories.
    substitutes?: string[];
};

// Note: This is intentionally local-only seed data for MVP/demo.
// Costs are approximate and should be refined later (e.g., via Spoonacular or a real price source).
export const INGREDIENT_CATALOG: Record<string, IngredientInfo> = {
    quinoa: { cost: 2.5, categories: ["carbs", "fiber"] },
    "leafy greens": { cost: 1.8, categories: ["magnesium", "fiber"], substitutes: ["spinach", "kale"] },
    spinach: { cost: 1.6, categories: ["magnesium", "fiber"] , substitutes: ["leafy greens"]},
    "pumpkin seeds": { cost: 1.7, categories: ["magnesium", "zinc"], substitutes: ["chia seeds", "walnuts"] },
    "olive oil": { cost: 3.2, categories: ["fiber"] },
    paneer: { cost: 3.6, categories: ["protein", "iron"] , substitutes: ["lentils"]},
    garlic: { cost: 0.8, categories: ["protein"] },
    lentils: { cost: 2.2, categories: ["protein", "iron"] , substitutes: ["chickpeas"]},
    tomatoes: { cost: 1.4, categories: ["vitamin c"] },
    basil: { cost: 0.9, categories: ["vitamin c"] },
    parmesan: { cost: 2.4, categories: ["protein"] },
    chickpeas: { cost: 2.1, categories: ["protein", "fiber"] , substitutes: ["lentils","beans"]},
    cucumber: { cost: 0.7, categories: ["fiber"] },
    lemon: { cost: 0.8, categories: ["vitamin c"] },
    walnuts: { cost: 2.0, categories: ["omega-3"], substitutes: ["chia seeds", "pumpkin seeds"] },
    salmon: { cost: 6.0, categories: ["omega-3", "protein"] , substitutes: ["chia seeds","walnuts"]},
    asparagus: { cost: 2.2, categories: ["fiber"] },
    "brown rice": { cost: 2.0, categories: ["carbs"] },
    chicken: { cost: 5.2, categories: ["protein", "b-vitamins"] , substitutes: ["chickpeas","lentils"]},
    ginger: { cost: 0.6, categories: ["b-vitamins"] },
    "sesame seeds": { cost: 1.3, categories: ["protein", "iron"], substitutes: ["chia seeds"] },
    "soy sauce": { cost: 0.7, categories: ["protein"] },
    beef: { cost: 6.2, categories: ["protein", "iron"], substitutes: ["chickpeas","lentils"] },
    carrots: { cost: 0.9, categories: ["fiber"] },
    potatoes: { cost: 1.2, categories: ["carbs", "fiber"] },
    onions: { cost: 0.7, categories: ["fiber"] },
    broccoli: { cost: 1.5, categories: ["vitamin c", "fiber"] },
    shrimp: { cost: 6.4, categories: ["protein", "omega-3"], substitutes: ["salmon","chia seeds"] },
    "bell peppers": { cost: 1.6, categories: ["vitamin c"] },
    avocado: { cost: 2.4, categories: ["fiber"] },
    tortillas: { cost: 1.8, categories: ["carbs"] },
    "sweet potato": { cost: 1.7, categories: ["carbs", "fiber"] },
    greens: { cost: 1.8, categories: ["magnesium", "fiber"] , substitutes: ["leafy greens"]},
    "chia seeds": { cost: 1.9, categories: ["omega-3", "fiber", "magnesium"], substitutes: ["walnuts","pumpkin seeds"] },
    banana: { cost: 0.8, categories: ["carbs"] },
    berries: { cost: 2.0, categories: ["vitamin c", "fiber"] },
    oats: { cost: 1.2, categories: ["fiber", "iron"] },
    mango: { cost: 1.7, categories: ["vitamin c"] },
    "coconut milk": { cost: 1.9, categories: ["protein"] },
    "rice noodles": { cost: 1.6, categories: ["carbs"] },
    "brown rice (optional)": { cost: 2.0, categories: ["carbs"] },
};

