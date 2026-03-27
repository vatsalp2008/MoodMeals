import { AppShell } from "@/components/AppShell";

export const metadata = {
    title: "MoodMeals — Your App",
    description: "Emotion-aware meal planning dashboard.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
