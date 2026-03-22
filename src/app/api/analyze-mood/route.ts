import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

type AllowedEmotion = "stressed" | "tired" | "happy" | "focused" | "sad" | "energetic" | "calm";
type AllowedIntensity = "low" | "medium" | "high";
type AllowedRecommendedMood =
    | "calm"
    | "relaxed"
    | "focused"
    | "energetic"
    | "happy"
    | "comforting"
    | "light"
    | "grounding";

const ALLOWED_EMOTIONS: AllowedEmotion[] = ["stressed", "tired", "happy", "focused", "sad", "energetic", "calm"];
const ALLOWED_INTENSITIES: AllowedIntensity[] = ["low", "medium", "high"];
const ALLOWED_RECOMMENDED_MOODS: AllowedRecommendedMood[] = [
    "calm",
    "relaxed",
    "focused",
    "energetic",
    "happy",
    "comforting",
    "light",
    "grounding",
];

const normalizeIntensity = (moodTextLower: string): AllowedIntensity => {
    // Heuristic: longer and more descriptive logs usually indicate stronger intensity.
    const len = moodTextLower.length;
    if (len >= 120) return "high";
    if (len >= 50) return "medium";
    return "low";
};

const validateAndNormalize = (input: unknown, fallback: ReturnType<typeof localHeuristicEngine>, source: string) => {
    const obj = input as Partial<{
        emotion: string;
        intensity: string;
        recommendedMoods: unknown;
        message: unknown;
    }>;

    const emotion = typeof obj?.emotion === "string" ? (obj.emotion as AllowedEmotion) : undefined;
    const intensity = typeof obj?.intensity === "string" ? (obj.intensity as AllowedIntensity) : undefined;

    const recommendedMoods = Array.isArray(obj?.recommendedMoods)
        ? obj.recommendedMoods.filter((x) => typeof x === "string") as string[]
        : [];

    const normalizedRecommendedMoods = Array.from(
        new Set(
            recommendedMoods.filter((m) => ALLOWED_RECOMMENDED_MOODS.includes(m as AllowedRecommendedMood)) as AllowedRecommendedMood[]
        )
    ).slice(0, 3);

    const message = typeof obj?.message === "string" ? obj.message : undefined;

    const isValid =
        emotion && ALLOWED_EMOTIONS.includes(emotion) && intensity && ALLOWED_INTENSITIES.includes(intensity) && normalizedRecommendedMoods.length > 0 && message;

    if (!isValid) {
        // If Gemini output is malformed or out-of-schema, use the local fallback as-is.
        return { ...fallback };
    }

    return {
        emotion: emotion as AllowedEmotion,
        intensity: intensity as AllowedIntensity,
        recommendedMoods: normalizedRecommendedMoods,
        message,
        source,
    };
};

// --- Local Heuristic Engine ---
// This handles the logic when Gemini is unavailable or key is missing.
const localHeuristicEngine = (text: string) => {
    const moodText = text.toLowerCase();

    // Define keyword maps
    const emotionMap = [
        { label: "stressed", keywords: ["stress", "anxious", "worried", "pressure", "deadline", "busy", "overwhelmed"] },
        { label: "tired", keywords: ["tired", "exhausted", "sleepy", "drain", "fatigue", "beat", "low energy", "worn out"] },
        { label: "happy", keywords: ["happy", "good", "great", "awesome", "vibing", "excellent", "glad", "joy"] },
        { label: "focused", keywords: ["focus", "study", "work", "concentration", "grind", "productive", "sharp"] },
        { label: "sad", keywords: ["sad", "unhappy", "down", "gloomy", "blue", "heartbroken", "lonely"] },
        { label: "energetic", keywords: ["energetic", "hyper", "active", "pumped", "ready", "workout", "gym"] },
        { label: "calm", keywords: ["calm", "relax", "chill", "peace", "serene", "quiet"] }
    ];

    // Simple negation check (e.g., "not happy")
    const isNegative = moodText.includes("not ") || moodText.includes("don't ") || moodText.includes("never ");

    // Find best match
    let detectedEmotion = "calm"; // Default
    for (const group of emotionMap) {
        if (group.keywords.some(k => moodText.includes(k))) {
            detectedEmotion = group.label;
            break;
        }
    }

    // Handle negation logic (extremely basic flip)
    if (isNegative && detectedEmotion === "happy") detectedEmotion = "sad";
    if (isNegative && detectedEmotion === "calm") detectedEmotion = "stressed";

    // Map emotions to recommendation tags and messages
    const responseMap: Record<string, { moods: string[], msg: string }> = {
        stressed: {
            moods: ["calm", "grounding", "comforting"],
            msg: "It sounds like you've had a lot on your plate. A grounding, warm meal might help you find some calm."
        },
        tired: {
            moods: ["energetic", "comforting"],
            msg: "You've been working hard. Let's get some energy back into your system with a revitalizing meal."
        },
        happy: {
            moods: ["light", "happy"],
            msg: "Love the energy! Let's keep that vibrant mood going with something light and fresh."
        },
        focused: {
            moods: ["focused", "light"],
            msg: "You seem targeted on your goals. Let's fuel that concentration with something light and brain-boosting."
        },
        sad: {
            moods: ["comforting", "happy"],
            msg: "I'm sorry you're feeling down. Sometimes a warm, comforting meal is the first step toward feeling a bit better."
        },
        energetic: {
            moods: ["energetic", "light", "focused"],
            msg: "You're powered up! Let's sustain that fire with a high-performance, vibrant meal."
        },
        calm: {
            moods: ["calm", "relaxed", "light"],
            msg: "Staying balanced is a skill. Here are some light and relaxed choices to match your vibe."
        }
    };

    const result = responseMap[detectedEmotion] || responseMap.calm;

    return {
        emotion: detectedEmotion,
        intensity: normalizeIntensity(moodText),
        recommendedMoods: result.moods,
        message: result.msg,
        source: "local-heuristic",
    };
};


// --- API Route Handler ---

export async function POST(req: NextRequest) {
    const requestId = randomUUID();

    const body = await req
        .json()
        .then((v) => v)
        .catch(() => null as unknown);

    type AnalyzeMoodRequestBody = {
        mood?: unknown;
        inputMode?: unknown;
        sustainChoice?: unknown;
    };

    const typedBody = body as AnalyzeMoodRequestBody | null;

    const mood = typedBody?.mood;
    const inputMode = typedBody?.inputMode;
    const sustainChoice = typedBody?.sustainChoice;

    if (!mood || typeof mood !== "string") {
        return NextResponse.json({ error: "Mood text is required.", requestId }, { status: 400 });
    }

    const trimmedMood = mood.trim();
    if (!trimmedMood) {
        return NextResponse.json({ error: "Mood text cannot be empty.", requestId }, { status: 400 });
    }
    if (trimmedMood.length > 2000) {
        return NextResponse.json({ error: "Mood text is too long (max 2000 chars).", requestId }, { status: 400 });
    }

    const localFallback = localHeuristicEngine(trimmedMood);

    const apiKey = process.env.GEMINI_API_KEY;
    const isMockKey = !apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here";

    // If key is missing or is placeholder, use local engine immediately
    if (isMockKey) {
        console.log(
            `[analyze-mood] requestId=${requestId} inputMode=${inputMode ?? "unknown"} sustainChoice=${
                sustainChoice ?? "unknown"
            } -> using local heuristic (missing/placeholder key)`
        );
        return NextResponse.json({ ...localFallback, requestId });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
You are a nutritional mood expert. User's mood: "${trimmedMood}"
Respond ONLY with valid JSON (no markdown):
{
  "emotion": "<stressed | tired | happy | focused | sad | energetic | calm>",
  "intensity": "<low | medium | high>",
  "recommendedMoods": ["<1-3 tags from: calm, relaxed, focused, energetic, happy, comforting, light, grounding>"],
  "message": "<1 empathetic sentence about how food can help their mood>"
}
`;

        console.log(
            `[analyze-mood] requestId=${requestId} inputMode=${inputMode ?? "unknown"} sustainChoice=${sustainChoice ?? "unknown"} -> calling Gemini`
        );

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleaned = text.replace(/^```json?\n?/, "").replace(/```$/, "").trim();

        const parsed = JSON.parse(cleaned) as unknown;
        const response = validateAndNormalize(parsed, localFallback, "gemini-ai");

        console.log(
            `[analyze-mood] requestId=${requestId} -> emotion=${response.emotion} intensity=${response.intensity} recommendedMoods=${response.recommendedMoods.join(
                ","
            )} source=${response.source}`
        );

        return NextResponse.json({ ...response, requestId });

    } catch (err: unknown) {
        // If Gemini fails (429, 404, etc.), silently fallback to Local Engine
        console.warn(
            `[analyze-mood] requestId=${requestId} Gemini AI failed. Falling back to Local Heuristic Engine.`,
            err instanceof Error ? err.message : String(err)
        );
        return NextResponse.json({ ...localFallback, requestId });
    }
}
