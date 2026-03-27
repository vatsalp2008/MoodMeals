"use client";

import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
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

const GlossaryTermInner = ({ children, entry }: InnerProps) => {
    const [show, setShow] = useState(false);
    const [above, setAbove] = useState(true);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLSpanElement>(null);

    const updatePosition = useCallback(() => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        // If the wrapper is within the top 120px of the viewport, show tooltip below
        setAbove(rect.top > 120);
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

    const posClass = above ? styles.tooltipAbove : styles.tooltipBelow;
    const visClass = show ? styles.visible : "";

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
            <span
                ref={tooltipRef}
                id={`glossary-${entry.term}`}
                className={`${styles.tooltip} ${posClass} ${visClass}`}
                role="tooltip"
            >
                <span className={styles.termLabel}>{entry.term}</span>
                <span className={styles.definition}>{entry.definition}</span>
            </span>
        </span>
    );
};

export default GlossaryTerm;
