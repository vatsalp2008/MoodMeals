import { SEATTLE_BUDGET_TIPS, BUDGET_ALTERNATIVES } from '@/data/budgetTips';

describe('Budget tips data integrity', () => {
    // ── SEATTLE_BUDGET_TIPS ───────────────────────────────────────────

    it('has at least one budget tip', () => {
        expect(SEATTLE_BUDGET_TIPS.length).toBeGreaterThan(0);
    });

    it('all tips have required fields', () => {
        for (const tip of SEATTLE_BUDGET_TIPS) {
            expect(tip.id).toBeDefined();
            expect(typeof tip.id).toBe('string');

            expect(tip.category).toBeDefined();
            expect(['store', 'timing', 'resource']).toContain(tip.category);

            expect(tip.title).toBeDefined();
            expect(typeof tip.title).toBe('string');
            expect(tip.title.length).toBeGreaterThan(0);

            expect(tip.description).toBeDefined();
            expect(typeof tip.description).toBe('string');
            expect(tip.description.length).toBeGreaterThan(0);
        }
    });

    it('has no duplicate tip IDs', () => {
        const ids = SEATTLE_BUDGET_TIPS.map((t) => t.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('savingsEstimate is a string when present', () => {
        for (const tip of SEATTLE_BUDGET_TIPS) {
            if (tip.savingsEstimate !== undefined) {
                expect(typeof tip.savingsEstimate).toBe('string');
            }
        }
    });

    // ── BUDGET_ALTERNATIVES ───────────────────────────────────────────

    it('all budget alternative keys are lowercase', () => {
        const keys = Object.keys(BUDGET_ALTERNATIVES);
        expect(keys.length).toBeGreaterThan(0);
        for (const key of keys) {
            expect(key).toBe(key.toLowerCase());
        }
    });

    it('each entry has tip and store fields', () => {
        for (const [key, value] of Object.entries(BUDGET_ALTERNATIVES)) {
            expect(value.tip).toBeDefined();
            expect(typeof value.tip).toBe('string');
            expect(value.tip.length).toBeGreaterThan(0);

            expect(value.store).toBeDefined();
            expect(typeof value.store).toBe('string');
            expect(value.store.length).toBeGreaterThan(0);
        }
    });

    it('known ingredient "quinoa" maps correctly', () => {
        expect(BUDGET_ALTERNATIVES['quinoa']).toBeDefined();
        expect(BUDGET_ALTERNATIVES['quinoa'].store).toContain('99 Ranch');
    });

    it('known ingredient "salmon" maps correctly', () => {
        expect(BUDGET_ALTERNATIVES['salmon']).toBeDefined();
        expect(BUDGET_ALTERNATIVES['salmon'].store).toContain('QFC');
    });

    it('known ingredient "chickpeas" maps correctly', () => {
        expect(BUDGET_ALTERNATIVES['chickpeas']).toBeDefined();
        expect(BUDGET_ALTERNATIVES['chickpeas'].store).toContain('Uwajimaya');
    });

    it('known ingredient "tofu" maps correctly', () => {
        expect(BUDGET_ALTERNATIVES['tofu']).toBeDefined();
        expect(BUDGET_ALTERNATIVES['tofu'].store).toContain('99 Ranch');
    });

    it('unknown ingredient returns undefined', () => {
        expect(BUDGET_ALTERNATIVES['dragon-fruit']).toBeUndefined();
    });
});
