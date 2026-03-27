"use client";

import { useMemo } from "react";
import { useJournal, JournalEntry } from "@/context/JournalContext";
import styles from "./WellnessProgress.module.css";

/* ── Milestone definitions (cumulative, never lost) ── */
interface Milestone {
  emoji: string;
  label: string;
  check: (stats: Stats) => boolean;
  description: (stats: Stats) => string;
}

interface Stats {
  totalCheckins: number;
  mealsExplored: number;
  reflectionsCompleted: number;
  daysActive: number;
}

const MILESTONES: Milestone[] = [
  {
    emoji: "\u{1F331}",              // 🌱
    label: "First Steps",
    check: (s) => s.totalCheckins >= 1,
    description: (s) =>
      s.totalCheckins >= 1
        ? "You started your journey!"
        : `${1 - s.totalCheckins} check-in to go`,
  },
  {
    emoji: "\u{1F33F}",              // 🌿
    label: "Building Awareness",
    check: (s) => s.totalCheckins >= 5,
    description: (s) =>
      s.totalCheckins >= 5
        ? "5 check-ins reached!"
        : `${5 - s.totalCheckins} more check-in${5 - s.totalCheckins === 1 ? "" : "s"} to go`,
  },
  {
    emoji: "\u{1F333}",              // 🌳
    label: "Mood Explorer",
    check: (s) => s.totalCheckins >= 10 && s.mealsExplored >= 3,
    description: (s) => {
      const needs: string[] = [];
      if (s.totalCheckins < 10) needs.push(`${10 - s.totalCheckins} more check-in${10 - s.totalCheckins === 1 ? "" : "s"}`);
      if (s.mealsExplored < 3) needs.push(`${3 - s.mealsExplored} more meal${3 - s.mealsExplored === 1 ? "" : "s"}`);
      return needs.length ? needs.join(" & ") + " to go" : "10 check-ins & 3 meals!";
    },
  },
  {
    emoji: "\u{1F33B}",              // 🌻
    label: "Nourish Pro",
    check: (s) => s.totalCheckins >= 20 && s.reflectionsCompleted >= 5,
    description: (s) => {
      const needs: string[] = [];
      if (s.totalCheckins < 20) needs.push(`${20 - s.totalCheckins} more check-in${20 - s.totalCheckins === 1 ? "" : "s"}`);
      if (s.reflectionsCompleted < 5) needs.push(`${5 - s.reflectionsCompleted} more reflection${5 - s.reflectionsCompleted === 1 ? "" : "s"}`);
      return needs.length ? needs.join(" & ") + " to go" : "20 check-ins & 5 reflections!";
    },
  },
  {
    emoji: "\u{1F3D4}\uFE0F",       // 🏔️
    label: "Wellness Champion",
    check: (s) => s.totalCheckins >= 50 && s.daysActive >= 10,
    description: (s) => {
      const needs: string[] = [];
      if (s.totalCheckins < 50) needs.push(`${50 - s.totalCheckins} more check-in${50 - s.totalCheckins === 1 ? "" : "s"}`);
      if (s.daysActive < 10) needs.push(`${10 - s.daysActive} more day${10 - s.daysActive === 1 ? "" : "s"} active`);
      return needs.length ? needs.join(" & ") + " to go" : "50 check-ins & 10 days!";
    },
  },
];

/* ── Stat computation ── */
function computeStats(entries: JournalEntry[]): Stats {
  const uniqueDates = new Set(
    entries.map((e) => new Date(e.date).toDateString()),
  );

  return {
    totalCheckins: entries.length,
    mealsExplored: entries.filter((e) => e.mealName).length,
    reflectionsCompleted: entries.filter((e) => e.reflectionEmotion).length,
    daysActive: uniqueDates.size,
  };
}

/* ── Component ── */
export default function WellnessProgress() {
  const { entries } = useJournal();

  const stats = useMemo(() => computeStats(entries), [entries]);

  // Determine which milestones are completed and find the "next" one
  const completedCount = MILESTONES.filter((m) => m.check(stats)).length;
  const nextIndex = completedCount < MILESTONES.length ? completedCount : -1;

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Your Wellness Journey</h2>

      {/* ── Milestone Track ── */}
      <div className={styles.track}>
        {MILESTONES.map((m, i) => {
          const completed = m.check(stats);
          const isNext = i === nextIndex;

          return (
            <div key={m.label} className={styles.milestoneGroup}>
              {/* Connector line before (skip first) */}
              {i > 0 && (
                <div
                  className={`${styles.line} ${
                    completed ? styles.lineCompleted : ""
                  }`}
                />
              )}

              {/* Circle */}
              <div
                className={`${styles.circle} ${
                  completed
                    ? styles.circleCompleted
                    : isNext
                      ? styles.circleNext
                      : styles.circleFuture
                }`}
                title={m.label}
              >
                <span className={styles.emoji}>{m.emoji}</span>
              </div>

              {/* Label + description below */}
              <span
                className={`${styles.milestoneLabel} ${
                  completed
                    ? styles.labelCompleted
                    : isNext
                      ? styles.labelNext
                      : styles.labelFuture
                }`}
              >
                {m.label}
              </span>

              {isNext && (
                <span className={styles.milestoneHint}>
                  {m.description(stats)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Stat Counters ── */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{stats.totalCheckins}</span>
          <span className={styles.statLabel}>Check-ins</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{stats.mealsExplored}</span>
          <span className={styles.statLabel}>Meals explored</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{stats.reflectionsCompleted}</span>
          <span className={styles.statLabel}>Reflections</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{stats.daysActive}</span>
          <span className={styles.statLabel}>Days active</span>
        </div>
      </div>

      {/* ── Supportive microcopy ── */}
      <p className={styles.microcopy}>
        Every check-in counts. You&apos;re building a picture of your wellness
        &mdash; no streaks required.
      </p>
    </div>
  );
}
