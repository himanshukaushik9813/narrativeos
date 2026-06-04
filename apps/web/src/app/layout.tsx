import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";

import { Navbar } from "@/components/ui/Navbar";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "NarrativeOS Path Market",
  description: "AI-powered path intelligence for on-chain markets."
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap"
});

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
