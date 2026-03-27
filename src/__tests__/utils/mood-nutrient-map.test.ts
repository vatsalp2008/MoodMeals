import {
    getTargetNutrients,
    mergeSpoonacularParams,
    MOOD_NUTRIENT_MAP,
} from '@/data/mood-nutrient-map';

describe('MOOD_NUTRIENT_MAP data integrity', () => {
    it('has entries for core moods', () => {
        const expectedMoods = ['stressed', 'anxious', 'tired', 'sad', 'happy', 'focused', 'energetic', 'calm'];
        for (const mood of expectedMoods) {
            expect(MOOD_NUTRIENT_MAP[mood]).toBeDefined();
        }
    });

    it('each entry has nutrients array, spoonacularParams, and rationale', () => {
        for (const [mood, target] of Object.entries(MOOD_NUTRIENT_MAP)) {
            expect(Array.isArray(target.nutrients)).toBe(true);
            expect(target.nutrients.length).toBeGreaterThan(0);

            expect(typeof target.spoonacularParams).toBe('object');

            expect(typeof target.rationale).toBe('string');
            expect(target.rationale.length).toBeGreaterThan(0);
        }
    });
});

describe('getTargetNutrients', () => {
    it('returns magnesium for ["stressed"]', () => {
        const nutrients = getTargetNutrients(['stressed']);
        expect(nutrients).toContain('magnesium');
    });

    it('returns vitamin-b6 for ["stressed"]', () => {
        const nutrients = getTargetNutrients(['stressed']);
        expect(nutrients).toContain('vitamin-b6');
    });

    it('returns iron for ["tired"]', () => {
        const nutrients = getTargetNutrients(['tired']);
        expect(nutrients).toContain('iron');
        expect(nutrients).toContain('vitamin-b12');
    });

    it('returns tryptophan for ["sad"]', () => {
        const nutrients = getTargetNutrients(['sad']);
        expect(nutrients).toContain('tryptophan');
    });

    it('returns empty array for ["unknown"]', () => {
        const nutrients = getTargetNutrients(['unknown']);
        expect(nutrients).toEqual([]);
    });

    it('returns empty array for empty input', () => {
        const nutrients = getTargetNutrients([]);
        expect(nutrients).toEqual([]);
    });

    it('deduplicates nutrients across multiple moods', () => {
        const nutrients = getTargetNutrients(['stressed', 'tired']);
        // Both stressed and tired include vitamin-b6
        const countB6 = nutrients.filter((n) => n === 'vitamin-b6').length;
        expect(countB6).toBeLessThanOrEqual(1);
    });

    it('merges nutrients from multiple moods', () => {
        const nutrients = getTargetNutrients(['stressed', 'tired']);
        // from stressed
        expect(nutrients).toContain('magnesium');
        // from tired
        expect(nutrients).toContain('iron');
        expect(nutrients).toContain('vitamin-b12');
    });
});

describe('mergeSpoonacularParams', () => {
    it('returns empty object for empty moods', () => {
        const params = mergeSpoonacularParams([]);
        expect(params).toEqual({});
    });

    it('returns empty object for unknown moods', () => {
        const params = mergeSpoonacularParams(['unknown']);
        expect(params).toEqual({});
    });

    it('returns params for a single mood', () => {
        const params = mergeSpoonacularParams(['stressed']);
        expect(params.minMagnesium).toBe(50);
        expect(params.minVitaminB6).toBe(0.3);
    });

    it('takes the maximum value when merging overlapping params', () => {
        // stressed has minMagnesium: 50, calm has minMagnesium: 50
        const params = mergeSpoonacularParams(['stressed', 'calm']);
        expect(params.minMagnesium).toBe(50);
        // calm also adds minCalcium: 100
        expect(params.minCalcium).toBe(100);
    });

    it('combines params from different moods correctly', () => {
        const params = mergeSpoonacularParams(['stressed', 'tired']);
        // stressed: minMagnesium: 50, minVitaminB6: 0.3
        // tired: minIron: 3, minVitaminB12: 1
        expect(params.minMagnesium).toBe(50);
        expect(params.minVitaminB6).toBe(0.3);
        expect(params.minIron).toBe(3);
        expect(params.minVitaminB12).toBe(1);
    });

    it('takes the higher value for shared params across moods', () => {
        // focused has minIron: 3, tired has minIron: 3 — should be 3
        const params = mergeSpoonacularParams(['focused', 'tired']);
        expect(params.minIron).toBe(3);
    });
});
