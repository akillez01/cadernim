import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant"
});

export const metadata: Metadata = {
  title: "Cadernim",
  description: "Plataforma de estudo interativo de hinos com partitura, playback e assistente pedagogico.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Cadernim" },
  other: {
    google: "notranslate",
    "mobile-web-app-capable": "yes"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3a5a40" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} ${cormorant.variable} notranslate font-[var(--font-manrope)]`}
      >
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
