import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoodInput from "../MoodInput";
import { MoodProvider } from "../../context/MoodContext";

const mockGeminiResponse = {
    emotion: "stressed",
    intensity: "medium",
    recommendedMoods: ["calm", "grounding"],
    message: "A grounding meal can help you feel calmer.",
};

describe("MoodInput", () => {
    it("submits free-text mood with inputMode=text and sustainChoice=sustain", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockGeminiResponse,
        });
        // @ts-expect-error - vitest jsdom fetch typing
        global.fetch = mockFetch;

        const user = userEvent.setup();

        render(
            <MoodProvider>
                <MoodInput />
            </MoodProvider>
        );

        const textarea = screen.getByPlaceholderText(/i'm super stressed/i);
        await user.type(textarea, "I'm super stressed from work and need something warm and comforting");

        await user.click(screen.getByRole("button", { name: /analyze mood/i }));

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());

        const options = mockFetch.mock.calls[0][1];
        const payload = JSON.parse(options.body as string);

        expect(payload.inputMode).toBe("text");
        expect(payload.sustainChoice).toBe("sustain");
        expect(typeof payload.mood).toBe("string");
        expect(payload.mood.length).toBeGreaterThan(0);
    });

    it("submits slider-mode mood with inputMode=sliders and sustainChoice=wind_down", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockGeminiResponse,
        });
        // @ts-expect-error - vitest jsdom fetch typing
        global.fetch = mockFetch;

        const user = userEvent.setup();

        render(
            <MoodProvider>
                <MoodInput />
            </MoodProvider>
        );

        await user.click(screen.getByRole("button", { name: /mood sliders/i }));
        await user.click(screen.getByRole("button", { name: /wind down/i }));

        // Set the first range slider (Stress).
        const sliders = screen.getAllByRole("slider");
        expect(sliders.length).toBeGreaterThanOrEqual(1);
        fireEvent.change(sliders[0] as HTMLInputElement, { target: { value: "80" } });

        await user.click(screen.getByRole("button", { name: /analyze mood/i }));

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());

        const options = mockFetch.mock.calls[0][1];
        const payload = JSON.parse(options.body as string);

        expect(payload.inputMode).toBe("sliders");
        expect(payload.sustainChoice).toBe("wind_down");
        expect(typeof payload.mood).toBe("string");
        expect(payload.mood.length).toBeGreaterThan(0);
    });
});

