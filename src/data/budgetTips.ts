export interface BudgetTip {
    id: string;
    category: "store" | "timing" | "resource";
    title: string;
    description: string;
    savingsEstimate?: string;
}

export const SEATTLE_BUDGET_TIPS: BudgetTip[] = [
    {
        id: "bt1",
        category: "store",
        title: "99 Ranch / Uwajimaya Bulk Staples",
        description: "Rice, lentils, spices, and tofu at 40-50% less than mainstream grocers. Great for meal prep basics.",
        savingsEstimate: "40-50%",
    },
    {
        id: "bt2",
        category: "timing",
        title: "QFC Wednesday Protein Discounts",
        description: "Chicken, salmon, and ground turkey are marked down every Wednesday at most QFC locations.",
        savingsEstimate: "25-30%",
    },
    {
        id: "bt3",
        category: "timing",
        title: "Pike Place End-of-Day Markdowns",
        description: "Visit after 5 PM for 'ugly produce' deals — perfectly good fruits and vegetables at steep discounts.",
        savingsEstimate: "50-70%",
    },
    {
        id: "bt4",
        category: "store",
        title: "Grocery Outlet Bargain Market",
        description: "Name-brand groceries at discount prices. Stock rotates weekly — great for pantry staples and snacks.",
        savingsEstimate: "30-50%",
    },
    {
        id: "bt5",
        category: "resource",
        title: "SODO Community Market",
        description: "Free grocery market open to all Seattle residents. No income verification required.",
    },
    {
        id: "bt6",
        category: "resource",
        title: "UW District Food Bank",
        description: "Free weekly food distributions near campus. Students welcome — bring your Husky ID.",
    },
];

export const BUDGET_ALTERNATIVES: Record<string, { tip: string; store: string }> = {
    "quinoa": { tip: "Get quinoa at 99 Ranch — 40% cheaper than Whole Foods", store: "99 Ranch" },
    "salmon": { tip: "Wednesday salmon deals at QFC, or frozen at Grocery Outlet", store: "QFC / Grocery Outlet" },
    "chickpeas": { tip: "Dried chickpeas at Uwajimaya — 60% cheaper than canned", store: "Uwajimaya" },
    "spinach": { tip: "Pike Place end-of-day bundles — often $1/bunch after 5 PM", store: "Pike Place" },
    "paneer": { tip: "Indian grocery on Aurora Ave has fresh paneer at half the price", store: "Aurora Indian Grocery" },
    "tofu": { tip: "99 Ranch tofu is $1-2 vs $3-4 at mainstream stores", store: "99 Ranch" },
    "lentils": { tip: "Buy dry lentils in bulk at Uwajimaya — 50% savings", store: "Uwajimaya" },
    "rice": { tip: "25lb rice bags at 99 Ranch — best per-unit price in Seattle", store: "99 Ranch" },
    "avocado": { tip: "Grocery Outlet often has avocados at $0.50 each", store: "Grocery Outlet" },
    "chicken": { tip: "QFC Wednesday chicken deals — up to 30% off", store: "QFC" },
};

export const TIP_CATEGORY_ICONS: Record<string, string> = {
    store: "🏪",
    timing: "⏰",
    resource: "🤝",
};
