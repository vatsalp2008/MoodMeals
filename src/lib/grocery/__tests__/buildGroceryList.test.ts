import { describe, expect, it } from "vitest";
import { MEALS } from "../../../data/meals";
import { buildGroceryList } from "../buildGroceryList";

describe("buildGroceryList", () => {
    it("prioritizes nutrient-first ingredients when budget is tight", () => {
        const meal = MEALS.find((m) => m.id === "v1");
        expect(meal).toBeTruthy();
        if (!meal) return;

        const result = buildGroceryList({
            meals: [meal],
            pantryItems: [],
            budget: 2, // can’t afford all nutrient-relevant ingredients
            moodTags: ["calm", "grounding"],
        });

        expect(result.totalCost).toBeLessThanOrEqual(2 + 1e-6);
        // With our seed data, "spinach" is the cheapest magnesium-rich option.
        expect(result.items.some((it) => it.key === "spinach")).toBe(true);
        expect(result.items.every((it) => it.cost > 0)).toBe(true);
    });

    it("applies substitution for nutrient categories when the primary ingredient is too expensive", () => {
        const meal = MEALS.find((m) => m.id === "nv1");
        expect(meal).toBeTruthy();
        if (!meal) return;

        const result = buildGroceryList({
            meals: [meal],
            pantryItems: [],
            budget: 5, // too small for salmon ($6), but enough for chia seeds substitution ($1.9)
            moodTags: ["focused"],
        });

        expect(result.totalCost).toBeLessThanOrEqual(5 + 1e-6);
        expect(result.items.some((it) => it.key === "salmon")).toBe(false);
        expect(result.items.some((it) => it.key === "chia seeds")).toBe(true);
        expect(result.substitutions.length).toBeGreaterThan(0);
    });
});

