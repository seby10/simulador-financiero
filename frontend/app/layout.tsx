import type { Metadata } from "next";
import "./globals.css";
import ThemeSync from "@/components/theme-sync";
import { API_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Simulador Financiero",
  description: "Módulo de verificación facial de identidad y análisis de vivacidad",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch institution config", error);
  }

  const primaryColor = config?.primaryColor || "#003b70";
  const secondaryColor = config?.secondaryColor || "#35b8db";
  const accentColor = config?.accentColor || "#10b981";
  const navbarBgColor = config?.navbarBgColor || "#ffffff";
  const navbarTextColor = config?.navbarTextColor || "#1e293b";
  const pageBgColor = config?.pageBgColor || "#f8fafc";
  const cardBgColor = config?.cardBgColor || "#ffffff";
  const footerBgColor = config?.footerBgColor || "#003b70";
  const footerTextColor = config?.footerTextColor || "#e2e8f0";

  return (
    <html lang="es" className="h-full antialiased">
      <body 
        className="min-h-full flex flex-col font-sans bg-[var(--brand-page-bg,#f8fafc)] text-slate-800"
        style={{
          '--brand-primary': primaryColor,
          '--brand-secondary': secondaryColor,
          '--brand-accent': accentColor,
          '--brand-navbar-bg': navbarBgColor,
          '--brand-navbar-text': navbarTextColor,
          '--brand-page-bg': pageBgColor,
          '--brand-card-bg': cardBgColor,
          '--brand-footer-bg': footerBgColor,
          '--brand-footer-text': footerTextColor,
        } as React.CSSProperties}
      >
        {children}
        <ThemeSync />
      </body>
    </html>
  );
}
