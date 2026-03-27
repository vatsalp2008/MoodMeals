"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type PantryUnit = "g" | "kg" | "ml" | "L" | "oz" | "lb" | "cups" | "tbsp" | "tsp" | "pieces" | "bunch" | "";

export interface PantryItem {
    id: string;
    name: string;
    category: "protein" | "grain" | "vegetable" | "dairy" | "spice" | "other";
    addedAt: string;
    quantity?: number;
    unit?: PantryUnit;
}

export type PantryItemStatus = "available" | "partial" | "none";

interface PantryContextType {
    items: PantryItem[];
    addItem: (name: string, category: PantryItem["category"], quantity?: number, unit?: PantryUnit) => void;
    addItems: (newItems: { name: string; category: PantryItem["category"] }[]) => void;
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Partial<PantryItem>) => void;
    hasItem: (name: string) => boolean;
    getItemStatus: (name: string) => PantryItemStatus;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<PantryItem[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("moodmeals_pantry");
            if (stored) setItems(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("moodmeals_pantry", JSON.stringify(items));
        } catch { /* ignore */ }
    }, [items]);

    const addItem = useCallback((name: string, category: PantryItem["category"], quantity?: number, unit?: PantryUnit) => {
        setItems(prev => {
            if (prev.some(i => i.name.toLowerCase() === name.toLowerCase())) return prev;
            const item: PantryItem = {
                id: `${Date.now()}-${Math.random()}`,
                name,
                category,
                addedAt: new Date().toISOString(),
            };
            if (quantity !== undefined) item.quantity = quantity;
            if (unit !== undefined && unit !== "") item.unit = unit;
            return [...prev, item];
        });
    }, []);

    const addItems = useCallback((newItems: { name: string; category: PantryItem["category"] }[]) => {
        setItems(prev => {
            const existingNames = new Set(prev.map(i => i.name.toLowerCase()));
            const toAdd = newItems
                .filter(n => !existingNames.has(n.name.toLowerCase()))
                .map(n => ({
                    id: `${Date.now()}-${Math.random()}`,
                    name: n.name,
                    category: n.category,
                    addedAt: new Date().toISOString(),
                }));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const updateItem = useCallback((id: string, updates: Partial<PantryItem>) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    }, []);

    /** Fuzzy-match helper: find a pantry item matching the given ingredient name. */
    const findMatchingItem = useCallback((name: string): PantryItem | undefined => {
        const nameLower = name.toLowerCase().trim();
        const GENERIC_WORDS = new Set(["oil", "water", "salt", "sugar", "flour", "milk", "egg", "butter"]);

        return items.find(i => {
            const pantryLower = i.name.toLowerCase().trim();

            if (pantryLower === nameLower) return true;

            if (GENERIC_WORDS.has(pantryLower) || GENERIC_WORDS.has(nameLower)) return false;

            const pantryInIngredient = nameLower.includes(pantryLower) && pantryLower.length >= 4;
            const ingredientInPantry = pantryLower.includes(nameLower) && nameLower.length >= 4;

            return pantryInIngredient || ingredientInPantry;
        });
    }, [items]);

    const hasItem = useCallback((name: string) => {
        return findMatchingItem(name) !== undefined;
    }, [findMatchingItem]);

    const getItemStatus = useCallback((name: string): PantryItemStatus => {
        const item = findMatchingItem(name);
        if (!item) return "none";
        // "partial": item exists but quantity is explicitly 0 (empty/low)
        if (item.quantity === 0) return "partial";
        // "available": item exists AND (has no quantity set OR quantity > 0)
        return "available";
    }, [findMatchingItem]);

    return (
        <PantryContext.Provider value={{ items, addItem, addItems, removeItem, updateItem, hasItem, getItemStatus }}>
            {children}
        </PantryContext.Provider>
    );
};

export const usePantry = () => {
    const ctx = useContext(PantryContext);
    if (!ctx) throw new Error("usePantry must be used inside PantryProvider");
    return ctx;
};
