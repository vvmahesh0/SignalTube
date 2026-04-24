import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";

import { AppFooter } from "@/components/app-footer";

import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Lora({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "SignalTube",
  description: "Turn YouTube videos into calm, structured research memos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${sans.variable} ${serif.variable}`}>
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
