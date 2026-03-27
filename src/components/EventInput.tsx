"use client";

import React, { useState } from "react";
import { useStressCalendar } from "../context/StressCalendarContext";
import type { CalendarEventType, StressLevel } from "../types";
import GoogleCalendarConnect from "./GoogleCalendarConnect";
import styles from "./EventInput.module.css";
import gcStyles from "./GoogleCalendarConnect.module.css";

const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
    { value: "deadline", label: "Deadline" },
    { value: "exam", label: "Exam" },
    { value: "presentation", label: "Presentation" },
    { value: "meeting", label: "Meeting" },
    { value: "other", label: "Other" },
];

const STRESS_BY_TYPE: Record<CalendarEventType, StressLevel> = {
    exam: "high",
    deadline: "high",
    presentation: "high",
    meeting: "medium",
    other: "low",
};

function stressTag(level: StressLevel) {
    const cls =
        level === "high"
            ? styles.tagHigh
            : level === "medium"
              ? styles.tagMedium
              : styles.tagLow;
    return <span className={`${styles.eventTypeTag} ${cls}`}>{level}</span>;
}

const EventInput = () => {
    const { events, addEvent, removeEvent } = useStressCalendar();
    const [open, setOpen] = useState(false);

    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [type, setType] = useState<CalendarEventType>("deadline");

    const canSubmit = title.trim() !== "" && date !== "";

    const handleAdd = () => {
        if (!canSubmit) return;
        addEvent({
            title: title.trim(),
            date,
            time: time || undefined,
            type,
        });
        setTitle("");
        setDate("");
        setTime("");
        setType("deadline");
    };

    // Sort events by date (soonest first)
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return (
        <div className={styles.section}>
            {/* Toggle button */}
            <button
                className={styles.toggle}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
            >
                <span className={styles.toggleIcon}>&#128197;</span>
                <span className={styles.toggleLabel}>
                    Add upcoming event
                    {events.length > 0 && ` (${events.length})`}
                </span>
                <span
                    className={`${styles.toggleArrow} ${open ? styles.toggleArrowOpen : ""}`}
                >
                    &#9660;
                </span>
            </button>

            {/* Collapsible content */}
            <div className={`${styles.content} ${open ? styles.contentOpen : ""}`}>
                <div className={styles.inner}>
                    {/* Google Calendar sync */}
                    <GoogleCalendarConnect />
                    <div className={gcStyles.divider}>or add events manually</div>

                    {/* Form */}
                    <div className={styles.formCard}>
                        <div className={styles.formGrid}>
                            <div className={`${styles.field} ${styles.fieldFull}`}>
                                <label className={styles.label} htmlFor="evt-title">
                                    Event title
                                </label>
                                <input
                                    id="evt-title"
                                    className={styles.input}
                                    type="text"
                                    placeholder='e.g., "Final Exam" or "Sprint Demo"'
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAdd();
                                        }
                                    }}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="evt-date">
                                    Date
                                </label>
                                <input
                                    id="evt-date"
                                    className={styles.input}
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="evt-time">
                                    Time (optional)
                                </label>
                                <input
                                    id="evt-time"
                                    className={styles.input}
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="evt-type">
                                    Type
                                </label>
                                <select
                                    id="evt-type"
                                    className={styles.select}
                                    value={type}
                                    onChange={(e) =>
                                        setType(e.target.value as CalendarEventType)
                                    }
                                >
                                    {EVENT_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div
                                className={styles.field}
                                style={{
                                    justifyContent: "flex-end",
                                }}
                            >
                                <button
                                    className={styles.addBtn}
                                    onClick={handleAdd}
                                    disabled={!canSubmit}
                                >
                                    + Add Event
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Events list */}
                    <div className={styles.eventsList}>
                        {sortedEvents.length === 0 && (
                            <div className={styles.emptyList}>
                                No events yet. Add one above to get proactive meal
                                suggestions.
                            </div>
                        )}
                        {sortedEvents.map((evt) => {
                            const stress =
                                evt.stressLevel ?? STRESS_BY_TYPE[evt.type];
                            return (
                                <div key={evt.id} className={styles.eventItem}>
                                    {stressTag(stress)}
                                    <div className={styles.eventInfo}>
                                        <div className={styles.eventTitle}>
                                            {evt.title}
                                        </div>
                                        <div className={styles.eventDate}>
                                            {new Date(evt.date).toLocaleDateString(
                                                undefined,
                                                {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                },
                                            )}
                                            {evt.time ? ` at ${evt.time}` : ""}
                                            {" \u2022 "}
                                            {evt.type}
                                        </div>
                                    </div>
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => removeEvent(evt.id)}
                                        aria-label={`Remove ${evt.title}`}
                                        title="Remove event"
                                    >
                                        &times;
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventInput;
