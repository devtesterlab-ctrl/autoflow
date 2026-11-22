import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Texto: Inter (limpia y muy legible en pantallas chicas). Títulos y precios: Plus Jakarta Sans.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AutoFlow", template: "%s · AutoFlow" },
  description: "Catálogo web y mini-CRM para agencias de autos usados.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        {children}
      </body>
    </html>
  );
}
