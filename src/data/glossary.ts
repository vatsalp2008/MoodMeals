export interface GlossaryEntry {
    term: string;
    definition: string;
    aliases?: string[];
}

export const GLOSSARY: GlossaryEntry[] = [
    {
        term: "DV",
        definition:
            "The recommended daily intake for a nutrient, based on a 2,000-calorie diet.",
        aliases: ["Daily Value", "% DV", "%DV"],
    },
    {
        term: "Magnesium",
        definition:
            "A mineral that helps regulate stress hormones and supports muscle relaxation.",
    },
    {
        term: "Iron",
        definition:
            "Carries oxygen to your brain and muscles \u2014 low iron causes fatigue and brain fog.",
    },
    {
        term: "Zinc",
        definition:
            "Supports immune function and helps regulate mood-related neurotransmitters.",
    },
    {
        term: "Folate",
        definition:
            "A B vitamin essential for producing serotonin and dopamine (mood chemicals).",
    },
    {
        term: "Tryptophan",
        definition:
            "An amino acid your body converts into serotonin, the \u2018feel-good\u2019 neurotransmitter.",
    },
    {
        term: "DHA",
        definition:
            "An omega-3 fatty acid that makes up 40% of brain cell membranes.",
    },
    {
        term: "Vitamin B6",
        definition:
            "Helps convert tryptophan to serotonin and supports GABA production.",
        aliases: ["vitamin-B6", "B6"],
    },
    {
        term: "Vitamin B12",
        definition:
            "Protects the nerve pathways needed for clear thinking.",
        aliases: ["vitamin-B12", "B12"],
    },
    {
        term: "Vitamin C",
        definition: "An antioxidant required for serotonin synthesis.",
        aliases: ["vitamin-C"],
    },
    {
        term: "Vitamin D",
        definition: "Activates genes that produce serotonin in the brain.",
        aliases: ["vitamin-D"],
    },
    {
        term: "Vitamin E",
        definition: "Protects brain cells from oxidative stress.",
        aliases: ["vitamin-E"],
    },
    {
        term: "Polyphenols",
        definition:
            "Plant compounds that reduce brain inflammation and support gut bacteria.",
    },
    {
        term: "Calories",
        definition:
            "A unit of energy \u2014 your body needs about 2,000 per day.",
        aliases: ["kcal", "calorie"],
    },
    {
        term: "Protein",
        definition:
            "Provides amino acids your body needs to build neurotransmitters.",
    },
    {
        term: "Fiber",
        definition:
            "Feeds beneficial gut bacteria that produce 95% of the body\u2019s serotonin.",
    },
    {
        term: "HPA axis",
        definition:
            "Your body\u2019s stress response system (hypothalamic-pituitary-adrenal).",
        aliases: ["HPA"],
    },
    {
        term: "GABA",
        definition: "The brain\u2019s primary calming neurotransmitter.",
    },
    {
        term: "Serotonin",
        definition:
            "A neurotransmitter that regulates mood, sleep, and appetite.",
    },
    {
        term: "Dopamine",
        definition:
            "A neurotransmitter associated with motivation, focus, and reward.",
    },
];

/**
 * Look up a glossary entry by term or alias (case-insensitive).
 */
export function findGlossaryEntry(
    query: string
): GlossaryEntry | undefined {
    const q = query.trim().toLowerCase();
    return GLOSSARY.find((entry) => {
        if (entry.term.toLowerCase() === q) return true;
        return entry.aliases?.some((a) => a.toLowerCase() === q) ?? false;
    });
}
