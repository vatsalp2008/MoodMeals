/**
 * USDA FoodData Central nutrient ID mapping.
 * Maps our internal nutrient keys to USDA nutrient IDs
 * and provides metadata for display.
 *
 * Reference: https://fdc.nal.usda.gov/api-guide.html
 */

export interface USDANutrientDef {
    id: number;
    name: string;
    unit: string;
    /** Approximate daily recommended value for scoring (mg or mcg) */
    dailyValue: number;
}

/** Map from our internal nutrient key to USDA nutrient number and metadata */
export const USDA_NUTRIENT_MAP: Record<string, USDANutrientDef> = {
    magnesium: { id: 304, name: 'Magnesium', unit: 'mg', dailyValue: 420 },
    iron: { id: 303, name: 'Iron', unit: 'mg', dailyValue: 18 },
    zinc: { id: 309, name: 'Zinc', unit: 'mg', dailyValue: 11 },
    'vitamin-b6': { id: 415, name: 'Vitamin B-6', unit: 'mg', dailyValue: 1.7 },
    'vitamin-b12': { id: 418, name: 'Vitamin B-12', unit: 'mcg', dailyValue: 2.4 },
    'vitamin-c': { id: 401, name: 'Vitamin C', unit: 'mg', dailyValue: 90 },
    'vitamin-d': { id: 328, name: 'Vitamin D (D2 + D3)', unit: 'mcg', dailyValue: 20 },
    'vitamin-e': { id: 323, name: 'Vitamin E', unit: 'mg', dailyValue: 15 },
    folate: { id: 435, name: 'Folate, total', unit: 'mcg', dailyValue: 400 },
    tryptophan: { id: 501, name: 'Tryptophan', unit: 'g', dailyValue: 0.25 },
    dha: { id: 621, name: 'DHA (22:6 n-3)', unit: 'g', dailyValue: 0.25 },
    calcium: { id: 301, name: 'Calcium', unit: 'mg', dailyValue: 1300 },
    potassium: { id: 306, name: 'Potassium', unit: 'mg', dailyValue: 4700 },
    selenium: { id: 317, name: 'Selenium', unit: 'mcg', dailyValue: 55 },
    omega3: { id: 851, name: 'Total omega-3 fatty acids (ALA+EPA+DHA)', unit: 'g', dailyValue: 1.6 },
    fiber: { id: 291, name: 'Fiber, total dietary', unit: 'g', dailyValue: 28 },
    protein: { id: 203, name: 'Protein', unit: 'g', dailyValue: 50 },
};

/** Reverse lookup: USDA nutrient ID -> our internal key */
export const USDA_ID_TO_KEY: Record<number, string> = Object.fromEntries(
    Object.entries(USDA_NUTRIENT_MAP).map(([key, def]) => [def.id, key])
);

/** The set of USDA nutrient IDs we care about, for API query filtering */
export const USDA_NUTRIENT_IDS = Object.values(USDA_NUTRIENT_MAP).map(d => d.id);
