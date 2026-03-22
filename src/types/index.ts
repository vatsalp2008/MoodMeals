export type MealPreference = 'veg' | 'non-veg' | 'vegan';

export interface Meal {
    id: string;
    name: string;
    description: string;
    preference: MealPreference;
    moodSync: string[]; // List of moods this meal is good for
    image: string;
    calories: number;
    // Metadata used to explain "Why this meal?" per recommended mood tag.
    // Keys should match values present in `moodSync` and/or `analysis.recommendedMoods`.
    nutrientsByMood: Record<string, string[]>; // e.g. { calm: ["magnesium"], focused: ["DHA"] }
    ingredientsByMood: Record<string, string[]>; // e.g. { calm: ["quinoa", "leafy greens"] }
}
