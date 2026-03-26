export type MealPreference = 'veg' | 'non-veg' | 'vegan';

export type AllergyType = "gluten" | "dairy" | "nuts" | "shellfish" | "soy" | "fish" | "eggs" | "sesame";

export type MealCuisine = "Indian" | "Mediterranean" | "Asian" | "Mexican" | "American" | "Fusion";
export type MealDietFocus = "protein-heavy" | "fiber-rich" | "low-calorie" | "balanced";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Nutrient {
    label: string;
    value: string;
}

export interface Ingredient {
    name: string;
    amount: string;
    category: "protein" | "grain" | "vegetable" | "dairy" | "spice" | "other";
}

export interface Meal {
    id: string;
    name: string;
    description: string;
    preference: MealPreference;
    moodSync: string[];
    image: string;
    calories: number;
    nutrients: Nutrient[];
    whyThisMeal: string;
    ingredients: Ingredient[];
    cuisine: MealCuisine;
    dietFocus: MealDietFocus;
    cookTime: number;
    mealType: MealType;
    nutrientProfile?: Record<string, number>;
    allergens?: AllergyType[];
    sourceUrl?: string;
}

export type ClinicalMoodState = "high-stress" | "cognitive-fatigue" | "depressive" | "poor-focus" | "burnout";

export interface MoodAnalysis {
    emotion: string;
    intensity: "low" | "medium" | "high";
    recommendedMoods: string[];
    message: string;
    clinicalState?: ClinicalMoodState;
    targetedNutrients?: string[];
}
