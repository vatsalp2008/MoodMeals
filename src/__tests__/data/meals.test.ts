import { MEALS } from '@/data/meals';
import type { MealPreference, MealEffort } from '@/types';

describe('MEALS data integrity', () => {
    const validPreferences: MealPreference[] = ['veg', 'non-veg', 'vegan'];
    const validEfforts: MealEffort[] = ['minimal', 'easy', 'moderate', 'involved'];

    it('has at least one meal', () => {
        expect(MEALS.length).toBeGreaterThan(0);
    });

    it('all meals have required fields', () => {
        for (const meal of MEALS) {
            expect(meal.id).toBeDefined();
            expect(typeof meal.id).toBe('string');
            expect(meal.id.length).toBeGreaterThan(0);

            expect(meal.name).toBeDefined();
            expect(typeof meal.name).toBe('string');
            expect(meal.name.length).toBeGreaterThan(0);

            expect(meal.description).toBeDefined();
            expect(typeof meal.description).toBe('string');

            expect(meal.preference).toBeDefined();
            expect(meal.image).toBeDefined();

            expect(meal.calories).toBeDefined();
            expect(typeof meal.calories).toBe('number');

            expect(meal.nutrients).toBeDefined();
            expect(Array.isArray(meal.nutrients)).toBe(true);

            expect(meal.whyThisMeal).toBeDefined();
            expect(typeof meal.whyThisMeal).toBe('string');

            expect(meal.ingredients).toBeDefined();
            expect(Array.isArray(meal.ingredients)).toBe(true);
            expect(meal.ingredients.length).toBeGreaterThan(0);

            expect(meal.cuisine).toBeDefined();
            expect(meal.dietFocus).toBeDefined();
            expect(meal.cookTime).toBeDefined();
            expect(meal.mealType).toBeDefined();
        }
    });

    it('has no duplicate meal IDs', () => {
        const ids = MEALS.map((m) => m.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('all preferences are valid ("veg" | "non-veg" | "vegan")', () => {
        for (const meal of MEALS) {
            expect(validPreferences).toContain(meal.preference);
        }
    });

    it('all cookTime values are positive numbers', () => {
        for (const meal of MEALS) {
            expect(typeof meal.cookTime).toBe('number');
            expect(meal.cookTime).toBeGreaterThan(0);
        }
    });

    it('all calories are positive numbers', () => {
        for (const meal of MEALS) {
            expect(typeof meal.calories).toBe('number');
            expect(meal.calories).toBeGreaterThan(0);
        }
    });

    it('all effort tags are valid if present', () => {
        for (const meal of MEALS) {
            if (meal.effort !== undefined) {
                expect(validEfforts).toContain(meal.effort);
            }
        }
    });

    it('all moodSync arrays are non-empty', () => {
        for (const meal of MEALS) {
            expect(Array.isArray(meal.moodSync)).toBe(true);
            expect(meal.moodSync.length).toBeGreaterThan(0);
        }
    });

    it('each nutrient has label and value', () => {
        for (const meal of MEALS) {
            for (const nutrient of meal.nutrients) {
                expect(nutrient.label).toBeDefined();
                expect(typeof nutrient.label).toBe('string');
                expect(nutrient.value).toBeDefined();
                expect(typeof nutrient.value).toBe('string');
            }
        }
    });

    it('each ingredient has name, amount, and category', () => {
        for (const meal of MEALS) {
            for (const ingredient of meal.ingredients) {
                expect(ingredient.name).toBeDefined();
                expect(typeof ingredient.name).toBe('string');
                expect(ingredient.amount).toBeDefined();
                expect(typeof ingredient.amount).toBe('string');
                expect(ingredient.category).toBeDefined();
            }
        }
    });

    it('covers all three dietary preferences', () => {
        const preferences = new Set(MEALS.map((m) => m.preference));
        expect(preferences.has('veg')).toBe(true);
        expect(preferences.has('non-veg')).toBe(true);
        expect(preferences.has('vegan')).toBe(true);
    });
});
