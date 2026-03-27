"use client";

import React, { useState } from "react";
import { useStressCalendar } from "../context/StressCalendarContext";
import type { StressIntervention } from "../types";
import styles from "./StressInterventionBanner.module.css";

const MAX_VISIBLE = 3;

function formatHours(h: number): string {
    if (h < 1) return "< 1 hour";
    if (h < 24) return `${Math.round(h)}h`;
    const days = Math.round(h / 24);
    return `${days} day${days !== 1 ? "s" : ""}`;
}

function stressIcon(level: string | undefined): string {
    switch (level) {
        case "high":
            return "\u26A0\uFE0F"; // warning
        case "medium":
            return "\uD83D\uDCC5"; // calendar
        default:
            return "\uD83D\uDCC5";
    }
}

const InterventionCard = ({
    intervention,
    onDismiss,
}: {
    intervention: StressIntervention;
    onDismiss: () => void;
}) => {
    const [expanded, setExpanded] = useState(false);
    const { event, suggestedMealTime, targetedNutrients, reason, hoursUntilEvent } =
        intervention;

    const stressClass =
        event.stressLevel === "high"
            ? styles.bannerHigh
            : event.stressLevel === "medium"
              ? styles.bannerMedium
              : "";

    return (
        <div className={`${styles.banner} ${stressClass}`}>
            {/* Compact header */}
            <div
                className={styles.header}
                onClick={() => setExpanded((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded((prev) => !prev);
                    }
                }}
            >
                <span className={styles.icon}>{stressIcon(event.stressLevel)}</span>
                <span className={styles.summaryText}>
                    {event.type.charAt(0).toUpperCase() + event.type.slice(1)} in{" "}
                    {formatHours(hoursUntilEvent)}
                    <span className={styles.timeTag}>{suggestedMealTime}</span>
                    {" \u2014 "}
                    We suggest a {targetedNutrients[0]}-rich {suggestedMealTime} to
                    help you prepare
                </span>
                <button
                    className={`${styles.expandBtn} ${expanded ? styles.expandBtnOpen : ""}`}
                    aria-label={expanded ? "Collapse details" : "Expand details"}
                    tabIndex={-1}
                >
                    &#9660;
                </button>
                <button
                    className={styles.dismissBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                    }}
                    aria-label="Dismiss intervention"
                    title="Dismiss"
                >
                    &times;
                </button>
            </div>

            {/* Expanded details */}
            <div className={`${styles.detail} ${expanded ? styles.detailOpen : ""}`}>
                <div className={styles.detailInner}>
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Event</span>
                        <span>
                            {event.title} ({event.type})
                        </span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>When</span>
                        <span>
                            {new Date(event.date).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                            })}
                            {event.time ? ` at ${event.time}` : ""}
                        </span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Suggested meal</span>
                        <span style={{ textTransform: "capitalize" }}>
                            {suggestedMealTime}
                        </span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Key nutrients</span>
                        <span className={styles.nutrientChips}>
                            {targetedNutrients.map((n) => (
                                <span key={n} className={styles.nutrientChip}>
                                    {n}
                                </span>
                            ))}
                        </span>
                    </div>
                    <p className={styles.reason}>{reason}</p>
                    <button
                        className={styles.actionBtn}
                        onClick={() => {
                            // Scroll to mood input section to trigger analysis with predicted state
                            document
                                .getElementById("mood-log")
                                ?.scrollIntoView({ behavior: "smooth" });
                        }}
                    >
                        Find meals for this &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

const StressInterventionBanner = () => {
    const { interventions, dismissIntervention, dismissedIds } =
        useStressCalendar();

    const visible = interventions
        .filter((i) => !dismissedIds.includes(i.event.id))
        .slice(0, MAX_VISIBLE);

    if (visible.length === 0) return null;

    return (
        <div className={styles.wrapper}>
            {visible.map((intervention) => (
                <InterventionCard
                    key={intervention.event.id}
                    intervention={intervention}
                    onDismiss={() => dismissIntervention(intervention.event.id)}
                />
            ))}
        </div>
    );
};

export default StressInterventionBanner;
