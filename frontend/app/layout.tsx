import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador Financiero - Verificación Biométrica",
  description: "Módulo de verificación facial de identidad y análisis de vivacidad",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
