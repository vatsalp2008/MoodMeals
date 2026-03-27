"use client";

import React, { ReactNode } from "react";
import { UserProvider } from "@/context/UserContext";

/**
 * Client-side providers wrapper.
 * Wraps the app in UserProvider (and any future context providers).
 */
const Providers = ({ children }: { children: ReactNode }) => {
    return <UserProvider>{children}</UserProvider>;
};

export default Providers;
