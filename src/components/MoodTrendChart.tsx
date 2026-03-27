"use client";

import { useState, useMemo, useCallback } from "react";
import { JournalEntry } from "@/context/JournalContext";
import styles from "./MoodTrendChart.module.css";

const EMOTION_COLORS: Record<string, string> = {
    stressed: "#e8836a",
    tired: "#b8a9d4",
    happy: "#7a9e87",
    focused: "#a5c8e4",
    sad: "#b8a9d4",
    energetic: "#f4a892",
    calm: "#a8c4b0",
    anxious: "#e8836a",
};

const EMOTION_Y: Record<string, number> = {
    happy: 25,
    energetic: 25,
    focused: 50,
    calm: 50,
    tired: 72,
    stressed: 92,
    sad: 92,
    anxious: 92,
};

const INTENSITY_RADIUS: Record<string, number> = {
    low: 5,
    medium: 7,
    high: 10,
};

const EMOTION_EMOJIS: Record<string, string> = {
    stressed: "😤",
    tired: "😴",
    happy: "😊",
    focused: "🎯",
    calm: "😌",
    sad: "😢",
    energetic: "⚡",
    anxious: "😰",
};

function formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export default function MoodTrendChart({ entries }: { entries: JournalEntry[] }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const recent = useMemo(() => entries.slice(0, 7).reverse(), [entries]);

    const viewBoxWidth = 600;
    const viewBoxHeight = 120;
    const paddingX = 40;

    const { points, linePoints, sortedFreq } = useMemo(() => {
        const usableWidth = viewBoxWidth - paddingX * 2;
        const step = recent.length > 1 ? usableWidth / (recent.length - 1) : 0;

        const pts = recent.map((entry, i) => ({
            x: paddingX + i * step,
            y: EMOTION_Y[entry.emotion] ?? 55,
            color: EMOTION_COLORS[entry.emotion] ?? "#7a9e87",
            r: INTENSITY_RADIUS[entry.intensity] ?? 7,
            label: entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1),
            dateStr: formatShortDate(entry.date),
            entry,
        }));

        const lp = pts.map(p => `${p.x},${p.y}`).join(" ");

        const freq: Record<string, number> = {};
        recent.forEach(e => { freq[e.emotion] = (freq[e.emotion] || 0) + 1; });
        const sf = Object.entries(freq).sort((a, b) => b[1] - a[1]);

        return { points: pts, linePoints: lp, sortedFreq: sf };
    }, [recent]);

    if (recent.length < 2) {
        return (
            <div className={styles.container}>
                <h3 className={styles.heading}>Mood Trend</h3>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📈</div>
                    <p>Log a few moods to see your trend</p>
                </div>
            </div>
        );
    }

    const handleMouseEnter = (i: number, e: React.MouseEvent<SVGCircleElement>) => {
        const svg = e.currentTarget.closest("svg");
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const point = points[i];
        const xPct = point.x / viewBoxWidth;
        const yPct = point.y / viewBoxHeight;
        setTooltipPos({
            x: rect.width * xPct,
            y: rect.height * yPct,
        });
        setHoveredIndex(i);
    };

    return (
        <div className={styles.container}>
            <h3 className={styles.heading}>Mood Trend</h3>
            <div className={styles.chartWrap}>
                <svg
                    className={styles.chart}
                    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Connector line */}
                    <polyline
                        points={linePoints}
                        className={styles.connectorLine}
                    />
                    {/* Dots */}
                    {points.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={p.r}
                            fill={p.color}
                            className={styles.dot}
                            onMouseEnter={(e) => handleMouseEnter(i, e)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <animate
                                attributeName="opacity"
                                from="0"
                                to="1"
                                dur="0.4s"
                                begin={`${i * 0.08}s`}
                                fill="freeze"
                            />
                        </circle>
                    ))}
                </svg>

                {hoveredIndex !== null && (
                    <div
                        className={styles.tooltip}
                        style={{
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                        }}
                    >
                        {EMOTION_EMOJIS[points[hoveredIndex].entry.emotion] ?? "🧠"}{" "}
                        {points[hoveredIndex].label}{" "}
                        · {points[hoveredIndex].dateStr}
                    </div>
                )}
            </div>

            <div className={styles.summary}>
                {sortedFreq.map(([emotion, count]) => (
                    <span key={emotion} className={styles.summaryChip}>
                        <span
                            className={styles.summaryDot}
                            style={{ background: EMOTION_COLORS[emotion] ?? "#7a9e87" }}
                        />
                        {emotion[0].toUpperCase() + emotion.slice(1)} {count}x
                    </span>
                ))}
            </div>
        </div>
    );
}