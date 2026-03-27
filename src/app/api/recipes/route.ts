import { NextRequest, NextResponse } from "next/server";

export interface SpoonacularRecipe {
    id: number;
    title: string;
    image: string;
    readyInMinutes: number;
    calories: number;
    nutrients: string[];
    sourceUrl: string;
}

const NUTRIENT_PARAM_MAP: Record<string, string> = {
    magnesium: "minMagnesium",
    iron: "minIron",
    zinc: "minZinc",
    "vitamin-b6": "minVitaminB6",
    "vitamin-b12": "minVitaminB12",
    "vitamin-c": "minVitaminC",
    "vitamin-d": "minVitaminD",
    "vitamin-e": "minVitaminE",
    folate: "minFolate",
    tryptophan: "minProtein", // proxy — Spoonacular doesn't have tryptophan filter
    dha: "minFat", // proxy for omega-3 rich
    polyphenols: "minFiber", // proxy for plant-rich foods
};

const apiKey = process.env.SPOONACULAR_API_KEY;

export async function GET(req: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ recipes: [], source: "no-key" });
    }

    const nutrients = req.nextUrl.searchParams.get("nutrients");
    if (!nutrients) {
        return NextResponse.json({ error: "nutrients param required" }, { status: 400 });
    }

    const nutrientList = nutrients.split(",").map(n => n.trim().toLowerCase());

    const params = new URLSearchParams({
        apiKey,
        number: "6",
        addRecipeNutrition: "true",
        sort: "healthiness",
        sortDirection: "desc",
    });

    for (const n of nutrientList) {
        const paramName = NUTRIENT_PARAM_MAP[n];
        if (!paramName) continue;
        params.set(paramName, "10");
    }

    try {
        const url = `https://api.spoonacular.com/recipes/complexSearch?${params}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            console.warn(`[recipes] Spoonacular returned ${res.status}`);
            return NextResponse.json({ recipes: [], source: "api-error" });
        }

        const data = await res.json();

        const recipes: SpoonacularRecipe[] = (data.results ?? []).map((r: Record<string, unknown>) => {
            const nutrition = r.nutrition as { nutrients?: { name: string; amount: number }[] } | undefined;
            const calorieEntry = nutrition?.nutrients?.find(
                (n: { name: string }) => n.name === "Calories"
            );

            const matchedNutrients = nutrientList.filter(n => NUTRIENT_PARAM_MAP[n] !== undefined);

            return {
                id: r.id,
                title: r.title,
                image: r.image,
                readyInMinutes: r.readyInMinutes ?? 30,
                calories: Math.round(calorieEntry?.amount ?? 0),
                nutrients: matchedNutrients.length > 0 ? matchedNutrients : nutrientList.slice(0, 2),
                sourceUrl: r.sourceUrl ?? `https://spoonacular.com/recipes/${r.id}`,
            };
        });

        return NextResponse.json({ recipes, source: "spoonacular" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[recipes] Spoonacular fetch failed:", message);
        return NextResponse.json({ recipes: [], source: "fetch-error" });
    }
}
