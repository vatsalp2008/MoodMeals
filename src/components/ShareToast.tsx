"use client";

import { useEffect } from "react";
import styles from "./ShareToast.module.css";

interface ShareToastProps {
    visible: boolean;
    onDismiss: () => void;
}

const ShareToast = ({ visible, onDismiss }: ShareToastProps) => {
    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(onDismiss, 2500);
        return () => clearTimeout(timer);
    }, [visible, onDismiss]);

    if (!visible) return null;

    return (
        <div className={styles.toast} role="status" aria-live="polite">
            <span className={styles.icon}>&#10003;</span>
            <span className={styles.text}>Link copied to clipboard!</span>
        </div>
    );
};

export default ShareToast;
