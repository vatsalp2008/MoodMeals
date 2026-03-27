"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePantry, PantryItem, PantryUnit } from "@/context/PantryContext";
import styles from "./page.module.css";

const UNITS: { value: PantryUnit; label: string }[] = [
    { value: "", label: "—" },
    { value: "g", label: "g" },
    { value: "kg", label: "kg" },
    { value: "ml", label: "ml" },
    { value: "L", label: "L" },
    { value: "oz", label: "oz" },
    { value: "lb", label: "lb" },
    { value: "cups", label: "cups" },
    { value: "tbsp", label: "tbsp" },
    { value: "tsp", label: "tsp" },
    { value: "pieces", label: "pcs" },
    { value: "bunch", label: "bunch" },
];

const QUICK_ADD: { name: string; category: PantryItem["category"] }[] = [
    { name: "Rice", category: "grain" },
    { name: "Chicken", category: "protein" },
    { name: "Eggs", category: "protein" },
    { name: "Spinach", category: "vegetable" },
    { name: "Tomatoes", category: "vegetable" },
    { name: "Onions", category: "vegetable" },
    { name: "Garlic", category: "spice" },
    { name: "Milk", category: "dairy" },
    { name: "Lentils", category: "protein" },
    { name: "Quinoa", category: "grain" },
    { name: "Chickpeas", category: "protein" },
    { name: "Olive Oil", category: "other" },
    { name: "Ginger", category: "spice" },
    { name: "Bell Peppers", category: "vegetable" },
    { name: "Broccoli", category: "vegetable" },
];

const CATEGORIES: { key: PantryItem["category"]; label: string; icon: string }[] = [
    { key: "protein", label: "Proteins", icon: "🥩" },
    { key: "grain", label: "Grains", icon: "🌾" },
    { key: "vegetable", label: "Vegetables", icon: "🥦" },
    { key: "dairy", label: "Dairy", icon: "🥛" },
    { key: "spice", label: "Spices & Herbs", icon: "🌿" },
    { key: "other", label: "Other", icon: "🫙" },
];

function InlineQuantityEditor({ item, onSave }: { item: PantryItem; onSave: (qty?: number, unit?: PantryUnit) => void }) {
    const [editing, setEditing] = useState(false);
    const [qty, setQty] = useState<string>(item.quantity !== undefined ? String(item.quantity) : "");
    const [unit, setUnit] = useState<PantryUnit>(item.unit ?? "");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    // Sync with prop changes
    useEffect(() => {
        setQty(item.quantity !== undefined ? String(item.quantity) : "");
        setUnit(item.unit ?? "");
    }, [item.quantity, item.unit]);

    const handleSave = () => {
        setEditing(false);
        const parsedQty = qty.trim() === "" ? undefined : Number(qty);
        const finalUnit = unit || undefined;
        onSave(
            parsedQty !== undefined && !isNaN(parsedQty) ? parsedQty : undefined,
            finalUnit
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
            setEditing(false);
            setQty(item.quantity !== undefined ? String(item.quantity) : "");
            setUnit(item.unit ?? "");
        }
    };

    const isEmpty = item.quantity === 0;

    if (editing) {
        return (
            <span className={styles.inlineEdit} onKeyDown={handleKeyDown}>
                <input
                    ref={inputRef}
                    type="number"
                    className={styles.inlineQtyInput}
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    onBlur={handleSave}
                    min={0}
                    step="any"
                    placeholder="qty"
                    aria-label="Quantity"
                />
                <select
                    className={styles.inlineUnitSelect}
                    value={unit}
                    onChange={e => setUnit(e.target.value as PantryUnit)}
                    aria-label="Unit"
                >
                    {UNITS.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>
            </span>
        );
    }

    if (item.quantity !== undefined) {
        return (
            <button
                type="button"
                className={`${styles.qtyDisplay} ${isEmpty ? styles.qtyEmpty : ""}`}
                onClick={() => setEditing(true)}
                title="Click to edit quantity"
                aria-label={`Edit quantity: ${item.quantity}${item.unit ?? ""}`}
            >
                {isEmpty ? (
                    <span className={styles.emptyLabel}>empty</span>
                ) : (
                    <>
                        <span className={styles.qtyValue}>{item.quantity}</span>
                        {item.unit && <span className={styles.qtyUnit}>{item.unit}</span>}
                    </>
                )}
            </button>
        );
    }

    return (
        <button
            type="button"
            className={styles.addQtyBtn}
            onClick={() => setEditing(true)}
            title="Add quantity"
            aria-label="Add quantity"
        >
            + qty
        </button>
    );
}

/** Auto-detect ingredient category from name keywords. */
function detectCategory(name: string): PantryItem["category"] {
    const lower = name.toLowerCase();
    const proteinKeywords = ["chicken", "beef", "fish", "salmon", "shrimp", "tofu", "eggs", "egg", "turkey", "pork", "meat", "lentils", "lentil", "beans", "bean", "chickpeas", "chickpea", "tempeh", "paneer"];
    const grainKeywords = ["rice", "bread", "pasta", "quinoa", "oats", "oat", "flour", "noodles", "noodle", "tortilla", "cereal", "couscous"];
    const vegetableKeywords = ["spinach", "tomato", "carrot", "pepper", "onion", "garlic", "broccoli", "lettuce", "avocado", "cucumber", "potato", "corn", "mushroom", "kale", "celery", "zucchini"];
    const dairyKeywords = ["milk", "cheese", "yogurt", "butter", "cream", "paneer", "ghee"];
    const spiceKeywords = ["salt", "pepper", "cumin", "turmeric", "paprika", "cinnamon", "oregano", "basil", "thyme", "ginger", "chili"];

    if (proteinKeywords.some(k => lower.includes(k))) return "protein";
    if (grainKeywords.some(k => lower.includes(k))) return "grain";
    if (vegetableKeywords.some(k => lower.includes(k))) return "vegetable";
    if (dairyKeywords.some(k => lower.includes(k))) return "dairy";
    if (spiceKeywords.some(k => lower.includes(k))) return "spice";
    return "other";
}

export default function PantryPage() {
    const { items, addItem, removeItem, updateItem } = usePantry();
    const [query, setQuery] = useState("");
    const [selectedCat, setSelectedCat] = useState<PantryItem["category"]>("other");
    const [catManuallySet, setCatManuallySet] = useState(false);
    const [addQty, setAddQty] = useState<string>("");
    const [addUnit, setAddUnit] = useState<PantryUnit>("");
    const nameInputRef = useRef<HTMLInputElement>(null);

    /** Quick-add: prepopulate form fields so user can optionally set qty/unit before adding. */
    const handleQuickAdd = useCallback((name: string, category: PantryItem["category"]) => {
        setQuery(name);
        setSelectedCat(category);
        setCatManuallySet(true);
        // Reset qty/unit so user starts fresh
        setAddQty("");
        setAddUnit("");
        // Focus the name input so the form is ready
        setTimeout(() => nameInputRef.current?.focus(), 0);
    }, []);

    const handleNameChange = (value: string) => {
        setQuery(value);
        // Auto-detect category unless user has manually overridden
        if (!catManuallySet) {
            setSelectedCat(detectCategory(value));
        }
    };

    const handleCatSelect = (cat: PantryItem["category"]) => {
        setSelectedCat(cat);
        setCatManuallySet(true);
    };

    const handleAdd = () => {
        const name = query.trim();
        if (!name) return;
        const parsedQty = addQty.trim() === "" ? undefined : Number(addQty);
        const finalQty = parsedQty !== undefined && !isNaN(parsedQty) ? parsedQty : undefined;
        const finalUnit: PantryUnit | undefined = addUnit || undefined;
        addItem(name, selectedCat, finalQty, finalUnit);
        setQuery("");
        setAddQty("");
        setAddUnit("");
        setSelectedCat("other");
        setCatManuallySet(false);
    };

    const handleInlineSave = (itemId: string, qty?: number, unit?: PantryUnit) => {
        updateItem(itemId, { quantity: qty, unit: unit ?? "" });
    };

    const availableQuick = QUICK_ADD.filter(
        q => !items.some(i => i.name.toLowerCase() === q.name.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Your Pantry</h1>
                <p className={styles.subtitle}>
                    Track what you have — we&apos;ll cross-check it against your grocery list.
                </p>
            </div>

            <div className={styles.container}>
                {/* Add section — redesigned card layout */}
                <div className={styles.addCard}>
                    <h2 className={styles.sectionTitle}>Add an ingredient</h2>

                    {/* Primary: ingredient name input */}
                    <input
                        ref={nameInputRef}
                        type="text"
                        className={styles.addInput}
                        placeholder="e.g., Chicken breast, Spinach, Rice..."
                        value={query}
                        onChange={e => handleNameChange(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAdd()}
                    />

                    {/* Secondary: quantity + unit inline row */}
                    <div className={styles.secondaryRow}>
                        <span className={styles.secondaryLabel}>Amount (optional)</span>
                        <div className={styles.secondaryFields}>
                            <input
                                type="number"
                                className={styles.qtyInput}
                                placeholder="Qty"
                                value={addQty}
                                onChange={e => setAddQty(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAdd()}
                                min={0}
                                step="any"
                                aria-label="Quantity"
                            />
                            <select
                                className={styles.unitSelect}
                                value={addUnit}
                                onChange={e => setAddUnit(e.target.value as PantryUnit)}
                                aria-label="Unit"
                            >
                                {UNITS.map(u => (
                                    <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category: visual pill/chip selector */}
                    <div className={styles.catChipsWrap}>
                        <span className={styles.secondaryLabel}>Category</span>
                        <div className={styles.catChips}>
                            {CATEGORIES.map(c => (
                                <button
                                    key={c.key}
                                    type="button"
                                    className={`${styles.catChip} ${selectedCat === c.key ? styles.catChipActive : ""}`}
                                    onClick={() => handleCatSelect(c.key)}
                                >
                                    {c.icon} {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className={styles.addBtn}
                        onClick={handleAdd}
                        disabled={!query.trim()}
                    >
                        + Add to Pantry
                    </button>

                    {availableQuick.length > 0 && (
                        <div className={styles.quickSection}>
                            <p className={styles.quickLabel}>Quick add:</p>
                            <div className={styles.quickChips}>
                                {availableQuick.map(q => (
                                    <button
                                        key={q.name}
                                        className={styles.quickChip}
                                        onClick={() => handleQuickAdd(q.name, q.category)}
                                    >
                                        + {q.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pantry items */}
                {items.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🥕</div>
                        <p className={styles.emptyTitle}>Your pantry is empty</p>
                        <p className={styles.emptyText}>Start adding ingredients above!</p>
                    </div>
                ) : (
                    <div className={styles.categories}>
                        {CATEGORIES.map(cat => {
                            const catItems = items.filter(i => i.category === cat.key);
                            if (catItems.length === 0) return null;
                            return (
                                <div key={cat.key} className={styles.catGroup}>
                                    <h3 className={styles.catTitle}>
                                        {cat.icon} {cat.label}
                                        <span className={styles.catCount}>{catItems.length}</span>
                                    </h3>
                                    <div className={styles.itemChips}>
                                        {catItems.map(item => {
                                            const isEmpty = item.quantity === 0;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`${styles.itemChip} ${isEmpty ? styles.itemChipEmpty : ""}`}
                                                >
                                                    <span className={`${styles.itemName} ${isEmpty ? styles.itemNameEmpty : ""}`}>
                                                        {item.name}
                                                    </span>
                                                    <InlineQuantityEditor
                                                        item={item}
                                                        onSave={(qty, unit) => handleInlineSave(item.id, qty, unit)}
                                                    />
                                                    <button
                                                        className={styles.removeBtn}
                                                        onClick={() => removeItem(item.id)}
                                                        aria-label={`Remove ${item.name}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
