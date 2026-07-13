import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// next/font/google downloads and self-hosts the font files at build time (no
// runtime request to Google), so this satisfies the design system's
// self-hosted/preload requirement without adding a font-binary asset to the
// repo - see docs/design.md Divergences.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "optional",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaxOps",
  description:
    "Educational tax optimisation, deductions, and wealth-preservation guidance for Australian daily-rate contractors and property investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
