import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Volkhov } from "next/font/google";
import "./globals.css";
import ThemeSync from "@/components/theme-sync";
import { API_URL } from "@/lib/api";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const volkhov = Volkhov({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const dynamic = "force-dynamic";

/**
 * Configuración institucional. Next deduplica los fetch idénticos dentro del
 * mismo render, así que el layout y generateMetadata comparten una sola ida.
 */
async function institutionConfig() {
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (error) {
    console.error("Failed to fetch institution config", error);
  }
  return null;
}

/**
 * El icono del navegador es el logo que se sube en administración. Si todavía
 * no hay ninguno, queda el de public/favicon.ico.
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await institutionConfig();
  return {
    title: "Simulador Financiero",
    description: "Módulo de verificación facial de identidad y análisis de vivacidad",
    icons: { icon: config?.logoUrl || "/favicon.ico" },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await institutionConfig();

  const primaryColor = config?.primaryColor || "#1e293b";
  const secondaryColor = config?.secondaryColor || "#df6951";
  const accentColor = config?.accentColor || "#f1a501";
  const navbarBgColor = config?.navbarBgColor || "#ffffff";
  const navbarTextColor = config?.navbarTextColor || "#1e293b";
  const pageBgColor = config?.pageBgColor || "#fefcf9";
  const cardBgColor = config?.cardBgColor || "#ffffff";
  const footerBgColor = config?.footerBgColor || "#181e2b";
  const footerTextColor = config?.footerTextColor || "#94a3b8";

  return (
    <html lang="es" className={`h-full antialiased ${plusJakarta.variable} ${volkhov.variable}`}>
      <body 
        className="min-h-full flex flex-col font-sans bg-[var(--brand-page-bg,#fefcf9)] text-slate-800 relative overflow-x-hidden"
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
        {/* Global Organic Top-Right Background Decore Shape */}
        <img 
          src="/assets/hero/decore-shape.png" 
          alt="" 
          className="absolute top-0 right-0 w-[420px] sm:w-[520px] lg:w-[640px] xl:w-[700px] pointer-events-none z-0 select-none"
        />
        {children}
        <ThemeSync />
      </body>
    </html>
  );
}

