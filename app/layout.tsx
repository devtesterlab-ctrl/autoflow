import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AutoFlow", template: "%s · AutoFlow" },
  description: "Catálogo web y mini-CRM para agencias de autos usados.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-[#F8FAFC] text-slate-900 antialiased dark:bg-[#090A0F] dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}
