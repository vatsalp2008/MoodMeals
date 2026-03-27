import { localHeuristicEngine } from '@/utils/heuristic-engine';

describe('localHeuristicEngine', () => {
    // ── Emotion detection ─────────────────────────────────────────────

    it('detects "stressed" from exam-related input', () => {
        const result = localHeuristicEngine('stressed about exams');
        expect(result.emotion).toBe('stressed');
        expect(result.source).toBe('local-heuristic');
    });

    it('detects "stressed" from "tensed" and sets maxCookTime for "quick meal"', () => {
        const result = localHeuristicEngine('tensed and need quick meal');
        expect(result.emotion).toBe('stressed');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.maxCookTime).toBe(15);
    });

    it('detects "happy" from positive input', () => {
        const result = localHeuristicEngine('happy and feeling great');
        expect(result.emotion).toBe('happy');
    });

    it('detects "tired" from exhaustion input', () => {
        const result = localHeuristicEngine('tired and exhausted');
        expect(result.emotion).toBe('tired');
    });

    it('detects "sad" when "not happy" (negation)', () => {
        const result = localHeuristicEngine('not happy about anything');
        expect(result.emotion).toBe('sad');
    });

    it('detects "stressed" when "not calm" (negation)', () => {
        const result = localHeuristicEngine('not calm at all');
        expect(result.emotion).toBe('stressed');
    });

    it('defaults to "calm" when no keywords match', () => {
        const result = localHeuristicEngine('just here');
        expect(result.emotion).toBe('calm');
    });

    // ── Suggested filters ─────────────────────────────────────────────

    it('sets mealType to "breakfast" for breakfast input', () => {
        const result = localHeuristicEngine('quick breakfast');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.mealType).toBe('breakfast');
        expect(result.suggestedFilters!.maxCookTime).toBe(15);
    });

    it('sets mealType to "lunch" for lunch input', () => {
        const result = localHeuristicEngine('need something for lunch');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.mealType).toBe('lunch');
    });

    it('sets mealType to "dinner" for dinner input', () => {
        const result = localHeuristicEngine('what should I have for dinner');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.mealType).toBe('dinner');
    });

    it('sets dietFocus to "protein-heavy" for gym input', () => {
        const result = localHeuristicEngine('protein for gym');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.dietFocus).toBe('protein-heavy');
    });

    it('sets dietFocus to "balanced" for comfort input', () => {
        const result = localHeuristicEngine('need some comfort food');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.dietFocus).toBe('balanced');
    });

    it('sets dietFocus to "low-calorie" for diet input', () => {
        const result = localHeuristicEngine('on a diet, something lean');
        expect(result.suggestedFilters).toBeDefined();
        expect(result.suggestedFilters!.dietFocus).toBe('low-calorie');
    });

    it('returns undefined suggestedFilters when no filter keywords present', () => {
        const result = localHeuristicEngine('stressed about exams');
        expect(result.suggestedFilters).toBeUndefined();
    });

    // ── Clinical mapping ──────────────────────────────────────────────

    it('maps stressed to high-stress clinical state', () => {
        const result = localHeuristicEngine('very stressed');
        expect(result.clinicalState).toBe('high-stress');
        expect(result.targetedNutrients).toContain('magnesium');
    });

    it('maps tired to cognitive-fatigue clinical state', () => {
        const result = localHeuristicEngine('so tired');
        expect(result.clinicalState).toBe('cognitive-fatigue');
        expect(result.targetedNutrients).toContain('iron');
        expect(result.targetedNutrients).toContain('vitamin-B12');
    });

    it('maps sad to depressive clinical state', () => {
        const result = localHeuristicEngine('feeling sad today');
        expect(result.clinicalState).toBe('depressive');
        expect(result.targetedNutrients).toContain('tryptophan');
    });

    // ── Response structure ────────────────────────────────────────────

    it('always returns required fields', () => {
        const result = localHeuristicEngine('anything');
        expect(result).toHaveProperty('emotion');
        expect(result).toHaveProperty('intensity');
        expect(result).toHaveProperty('recommendedMoods');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('clinicalState');
        expect(result).toHaveProperty('targetedNutrients');
        expect(result).toHaveProperty('contextualInsight');
        expect(result).toHaveProperty('userInputText');
        expect(result).toHaveProperty('source');
        expect(Array.isArray(result.recommendedMoods)).toBe(true);
        expect(Array.isArray(result.targetedNutrients)).toBe(true);
    });

    it('preserves the original user input text', () => {
        const input = 'Stressed about exams!!';
        const result = localHeuristicEngine(input);
        expect(result.userInputText).toBe(input);
    });

    it('sets intensity to "high" for long input (>50 chars)', () => {
        const longInput = 'I am very stressed about my upcoming exams and deadlines that are piling up';
        const result = localHeuristicEngine(longInput);
        expect(result.intensity).toBe('high');
    });

    it('sets intensity to "medium" for short input (<=50 chars)', () => {
        const shortInput = 'stressed';
        const result = localHeuristicEngine(shortInput);
        expect(result.intensity).toBe('medium');
    });
});
