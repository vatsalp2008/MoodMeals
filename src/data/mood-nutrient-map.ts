/**
 * Maps mood/emotion tags to the nutrients that clinical research
 * associates with alleviating or supporting that emotional state.
 *
 * Each mood maps to an array of our internal nutrient keys (matching
 * USDA_NUTRIENT_MAP keys) and Spoonacular nutrient query params.
 *
 * Sources: nutritional psychiatry literature, NotebookLM spec.
 */

export interface MoodNutrientTarget {
    /** Our internal nutrient keys (from usda-nutrients.ts) */
    nutrients: string[];
    /** Spoonacular complexSearch nutrient params (minXxx format) */
    spoonacularParams: Record<string, number>;
    /** Human-readable explanation of why these nutrients help */
    rationale: string;
}

export const MOOD_NUTRIENT_MAP: Record<string, MoodNutrientTarget> = {
    stressed: {
        nutrients: ['magnesium', 'vitamin-b6', 'vitamin-c', 'tryptophan', 'omega3'],
        spoonacularParams: { minMagnesium: 50, minVitaminB6: 0.3 },
        rationale: 'Magnesium calms the nervous system; B6 supports GABA production; tryptophan is a serotonin precursor.',
    },
    anxious: {
        nutrients: ['magnesium', 'omega3', 'dha', 'vitamin-b6', 'zinc'],
        spoonacularParams: { minMagnesium: 50, minZinc: 2 },
        rationale: 'Omega-3 DHA reduces neuroinflammation; magnesium and zinc modulate HPA axis stress response.',
    },
    tired: {
        nutrients: ['iron', 'vitamin-b12', 'vitamin-b6', 'folate', 'vitamin-c'],
        spoonacularParams: { minIron: 3, minVitaminB12: 1 },
        rationale: 'Iron carries oxygen to the brain; B12 and folate support energy metabolism and red blood cell formation.',
    },
    sad: {
        nutrients: ['tryptophan', 'omega3', 'dha', 'folate', 'vitamin-d', 'vitamin-b12'],
        spoonacularParams: { minFolate: 80 },
        rationale: 'Tryptophan converts to serotonin; omega-3 and vitamin D are linked to reduced depression symptoms.',
    },
    happy: {
        nutrients: ['tryptophan', 'vitamin-b6', 'vitamin-c', 'magnesium'],
        spoonacularParams: { minVitaminC: 15 },
        rationale: 'Sustain positive mood with serotonin precursors and antioxidants.',
    },
    focused: {
        nutrients: ['iron', 'dha', 'omega3', 'vitamin-b12', 'zinc', 'protein'],
        spoonacularParams: { minProtein: 20, minIron: 3 },
        rationale: 'DHA supports synaptic plasticity; iron and B12 fuel cognitive performance; protein sustains alertness.',
    },
    energetic: {
        nutrients: ['iron', 'vitamin-b12', 'vitamin-b6', 'protein', 'magnesium'],
        spoonacularParams: { minProtein: 20, minIron: 3 },
        rationale: 'B-vitamins and iron drive cellular energy production; protein prevents energy crashes.',
    },
    calm: {
        nutrients: ['magnesium', 'tryptophan', 'calcium', 'potassium', 'vitamin-b6'],
        spoonacularParams: { minMagnesium: 50, minCalcium: 100 },
        rationale: 'Magnesium and calcium support parasympathetic tone; tryptophan promotes restful serotonin/melatonin.',
    },
};

/**
 * Given an array of recommended mood tags (from the AI analysis),
 * return a deduplicated set of targeted nutrient keys.
 */
export function getTargetNutrients(moods: string[]): string[] {
    const nutrients = new Set<string>();
    for (const mood of moods) {
        const target = MOOD_NUTRIENT_MAP[mood];
        if (target) {
            for (const n of target.nutrients) {
                nutrients.add(n);
            }
        }
    }
    return Array.from(nutrients);
}

/**
 * Merge Spoonacular query params from multiple moods into a single params object.
 * Takes the maximum value for each param across all moods.
 */
export function mergeSpoonacularParams(moods: string[]): Record<string, number> {
    const merged: Record<string, number> = {};
    for (const mood of moods) {
        const target = MOOD_NUTRIENT_MAP[mood];
        if (target) {
            for (const [key, val] of Object.entries(target.spoonacularParams)) {
                merged[key] = Math.max(merged[key] ?? 0, val);
            }
        }
    }
    return merged;
}
