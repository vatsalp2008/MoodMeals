import { NextRequest, NextResponse } from "next/server";
import type { CalendarEventType } from "@/types";

// ---------------------------------------------------------------------------
// Keyword-based event type detection
// ---------------------------------------------------------------------------

function detectEventType(summary: string): CalendarEventType {
    const lower = summary.toLowerCase();

    if (/\b(exam|test|quiz|midterm|final)\b/.test(lower)) return "exam";
    if (/\b(deadline|due|submission|submit)\b/.test(lower)) return "deadline";
    if (/\b(present|demo|pitch)\b/.test(lower)) return "presentation";
    if (/\b(meeting|call|sync|standup|stand-up|1:1|one-on-one|check.?in)\b/.test(lower))
        return "meeting";

    return "other";
}

// ---------------------------------------------------------------------------
// Google Calendar event shape (partial)
// ---------------------------------------------------------------------------

interface GoogleCalendarEvent {
    id: string;
    summary?: string;
    start?: {
        dateTime?: string; // ISO 8601
        date?: string; // YYYY-MM-DD (all-day events)
    };
    status?: string;
}

interface GoogleCalendarListResponse {
    items?: GoogleCalendarEvent[];
    error?: { message: string; code: number };
}

// ---------------------------------------------------------------------------
// GET  /api/calendar/google
// Expects:  Authorization: Bearer <access_token>
// Returns:  { events: CalendarEvent[] }
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
            { error: "Missing or invalid Authorization header" },
            { status: 401 },
        );
    }

    const accessToken = authHeader.slice(7);

    // Fetch events from now to 7 days ahead
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: weekAhead.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`;

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });

        if (!res.ok) {
            const body = await res.text();
            console.warn(`[google-calendar] Google API returned ${res.status}:`, body);
            return NextResponse.json(
                { error: "Google Calendar API error", status: res.status },
                { status: res.status },
            );
        }

        const data: GoogleCalendarListResponse = await res.json();

        const events = (data.items ?? [])
            .filter((item) => item.status !== "cancelled" && item.summary)
            .map((item) => {
                const startDateTime = item.start?.dateTime;
                const startDate = item.start?.date;

                // Extract YYYY-MM-DD
                let date: string;
                let time: string | undefined;

                if (startDateTime) {
                    // "2026-03-27T14:30:00-07:00"
                    const d = new Date(startDateTime);
                    date = d.toISOString().slice(0, 10); // YYYY-MM-DD
                    time = d.toTimeString().slice(0, 5); // HH:MM
                } else if (startDate) {
                    // All-day event: "2026-03-27"
                    date = startDate;
                    time = undefined;
                } else {
                    return null;
                }

                const summary = item.summary ?? "Untitled event";
                const type = detectEventType(summary);

                return {
                    title: summary,
                    date,
                    time,
                    type,
                };
            })
            .filter(Boolean);

        return NextResponse.json({ events });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[google-calendar] Fetch failed:", message);
        return NextResponse.json(
            { error: "Failed to fetch Google Calendar events" },
            { status: 500 },
        );
    }
}
