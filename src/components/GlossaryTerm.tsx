"use client";

import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findGlossaryEntry, GlossaryEntry } from "../data/glossary";
import styles from "./GlossaryTerm.module.css";

interface GlossaryTermProps {
    children: ReactNode;
    term?: string;
}

const GlossaryTerm = ({ children, term }: GlossaryTermProps) => {
    // Resolve the glossary entry: use explicit term prop, or try to match children text
    const entry: GlossaryEntry | undefined = (() => {
        if (term) return findGlossaryEntry(term);
        if (typeof children === "string") return findGlossaryEntry(children);
        return undefined;
    })();

    // If no glossary match, render children as-is
    if (!entry) return <>{children}</>;

    return <GlossaryTermInner entry={entry}>{children}</GlossaryTermInner>;
};

interface InnerProps {
    children: ReactNode;
    entry: GlossaryEntry;
}

interface TooltipPos {
    top: number;
    left: number;
    above: boolean;
}

const GlossaryTermInner = ({ children, entry }: InnerProps) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState<TooltipPos | null>(null);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const [mounted, setMounted] = useState(false);

    // We need to know when we're in the browser for createPortal
    useEffect(() => {
        setMounted(true);
    }, []);

    const updatePosition = useCallback(() => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const above = rect.top > 160;
        setPos({
            top: above ? rect.top - 8 : rect.bottom + 8,
            left: rect.left + rect.width / 2,
            above,
        });
    }, []);

    const handleMouseEnter = useCallback(() => {
        updatePosition();
        setShow(true);
    }, [updatePosition]);

    const handleMouseLeave = useCallback(() => {
        setShow(false);
    }, []);

    const handleTap = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            // Only handle taps on touch devices
            if (e.type === "click" && "ontouchstart" in window) {
                e.preventDefault();
                e.stopPropagation();
                updatePosition();
                setShow((prev) => !prev);
            }
        },
        [updatePosition]
    );

    // Close tooltip when tapping elsewhere (mobile)
    useEffect(() => {
        if (!show) return;
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setShow(false);
            }
        };
        document.addEventListener("touchstart", handleOutside, true);
        document.addEventListener("mousedown", handleOutside, true);
        return () => {
            document.removeEventListener("touchstart", handleOutside, true);
            document.removeEventListener("mousedown", handleOutside, true);
        };
    }, [show]);

    // Recalculate position on scroll/resize while visible
    useEffect(() => {
        if (!show) return;
        const recalc = () => updatePosition();
        window.addEventListener("scroll", recalc, true);
        window.addEventListener("resize", recalc);
        return () => {
            window.removeEventListener("scroll", recalc, true);
            window.removeEventListener("resize", recalc);
        };
    }, [show, updatePosition]);

    const tooltip = show && pos && mounted
        ? createPortal(
              <span
                  ref={tooltipRef}
                  id={`glossary-${entry.term}`}
                  className={`${styles.tooltipPortal} ${styles.visible}`}
                  role="tooltip"
                  style={{
                      position: "fixed",
                      zIndex: 9999,
                      top: pos.above ? undefined : pos.top,
                      bottom: pos.above ? `calc(100vh - ${pos.top}px)` : undefined,
                      left: pos.left,
                      transform: "translateX(-50%)",
                  }}
              >
                  <span className={styles.termLabel}>{entry.term}</span>
                  <span className={styles.definition}>{entry.definition}</span>
              </span>,
              document.body,
          )
        : null;

    return (
        <span
            ref={wrapperRef}
            className={styles.wrapper}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleTap}
            role="button"
            tabIndex={0}
            aria-describedby={show ? `glossary-${entry.term}` : undefined}
        >
            {children}
            <span className={styles.infoIcon} aria-hidden="true">&#9432;</span>
            {tooltip}
        </span>
    );
};

export default GlossaryTerm;
