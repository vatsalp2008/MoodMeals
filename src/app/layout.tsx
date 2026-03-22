import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "MoodMeals — Eat for how you feel.",
  description: "MoodMeals is an emotion-aware meal planning app that combines mood tracking, nutrition science, and wearable data to recommend meals based on how you feel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#2d3a2e" />
            </head>
      <body className={`${plusJakartaSans.variable} ${lora.variable}`}>
        {children}
                <PWARegister />
      </body>
    </html>
  );
}
