import { findGlossaryEntry, GLOSSARY } from '@/data/glossary';

describe('Glossary data and lookup', () => {
    // ── Data integrity ────────────────────────────────────────────────

    it('has at least one glossary entry', () => {
        expect(GLOSSARY.length).toBeGreaterThan(0);
    });

    it('all entries have term and definition', () => {
        for (const entry of GLOSSARY) {
            expect(entry.term).toBeDefined();
            expect(typeof entry.term).toBe('string');
            expect(entry.term.length).toBeGreaterThan(0);

            expect(entry.definition).toBeDefined();
            expect(typeof entry.definition).toBe('string');
            expect(entry.definition.length).toBeGreaterThan(0);
        }
    });

    it('aliases are arrays of strings when present', () => {
        for (const entry of GLOSSARY) {
            if (entry.aliases !== undefined) {
                expect(Array.isArray(entry.aliases)).toBe(true);
                for (const alias of entry.aliases) {
                    expect(typeof alias).toBe('string');
                }
            }
        }
    });

    // ── Lookup by term ────────────────────────────────────────────────

    it('findGlossaryEntry("magnesium") returns an entry', () => {
        const entry = findGlossaryEntry('magnesium');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('Magnesium');
    });

    it('findGlossaryEntry("DV") returns an entry', () => {
        const entry = findGlossaryEntry('DV');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('DV');
    });

    it('findGlossaryEntry("Iron") returns an entry', () => {
        const entry = findGlossaryEntry('Iron');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('Iron');
    });

    // ── Lookup by alias ───────────────────────────────────────────────

    it('finds entry by alias "Daily Value"', () => {
        const entry = findGlossaryEntry('Daily Value');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('DV');
    });

    it('finds entry by alias "B6"', () => {
        const entry = findGlossaryEntry('B6');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('Vitamin B6');
    });

    it('finds entry by alias "vitamin-B12"', () => {
        const entry = findGlossaryEntry('vitamin-B12');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('Vitamin B12');
    });

    // ── Case-insensitive matching ─────────────────────────────────────

    it('case-insensitive: "MAGNESIUM" matches', () => {
        const entry = findGlossaryEntry('MAGNESIUM');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('Magnesium');
    });

    it('case-insensitive: "dv" matches', () => {
        const entry = findGlossaryEntry('dv');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('DV');
    });

    it('case-insensitive: "daily value" matches alias', () => {
        const entry = findGlossaryEntry('daily value');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('DV');
    });

    // ── Non-existent terms ────────────────────────────────────────────

    it('findGlossaryEntry("nonexistent") returns undefined', () => {
        const entry = findGlossaryEntry('nonexistent');
        expect(entry).toBeUndefined();
    });

    it('findGlossaryEntry("") returns undefined', () => {
        const entry = findGlossaryEntry('');
        expect(entry).toBeUndefined();
    });

    it('handles whitespace in query', () => {
        const entry = findGlossaryEntry('  magnesium  ');
        expect(entry).toBeDefined();
        expect(entry!.term).toBe('Magnesium');
    });
});
