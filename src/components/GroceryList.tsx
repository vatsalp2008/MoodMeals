"use client";

import React from "react";
import styles from "./GroceryList.module.css";
import { GroceryListItem, GrocerySubstitution } from "../lib/grocery/buildGroceryList";

const GroceryList = (props: {
    items: GroceryListItem[];
    totalCost: number;
    budget: number;
    substitutions: GrocerySubstitution[];
    note: string;
}) => {
    const { items, totalCost, budget, substitutions, note } = props;

    return (
        <section id="grocery-list" className={styles.section}>
            <div className={styles.card}>
                <h2 className={styles.title}>Your grocery list</h2>
                <p className={styles.note}>{note}</p>

                <div className={styles.metaRow} aria-label="Budget summary">
                    <div className={styles.meta}>
                        Budget: <span className={styles.metaValue}>${budget.toFixed(0)}</span>
                    </div>
                    <div className={styles.meta}>
                        Estimated total: <span className={styles.metaValue}>${totalCost.toFixed(2)}</span>
                    </div>
                </div>

                {items.length === 0 ? (
                    <p className={styles.empty}>No items to buy right now.</p>
                ) : (
                    <ul className={styles.list}>
                        {items.map((it) => (
                            <li key={it.key} className={styles.item}>
                                <span className={styles.itemName}>{it.name}</span>
                                <span className={styles.itemCost}>${it.cost.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {substitutions.length > 0 && (
                    <div className={styles.subs} aria-label="Substitutions applied">
                        <div className={styles.subsTitle}>Substitutions</div>
                        <ul className={styles.subsList}>
                            {substitutions.slice(0, 6).map((s, idx) => (
                                <li key={`${s.from}-${s.to}-${idx}`} className={styles.subsItem}>
                                    <span className={styles.subsFrom}>{s.from}</span> →{" "}
                                    <span className={styles.subsTo}>{s.to}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
};

export default GroceryList;

