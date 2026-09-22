import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador Financiero - Verificación Biométrica",
  description: "Módulo de verificación facial de identidad y análisis de vivacidad",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let config = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch institution config", error);
  }

  const primaryColor = config?.primaryColor || "#003b70";
  const secondaryColor = config?.secondaryColor || "#35b8db";

  return (
    <html lang="es" className="h-full antialiased">
      <body 
        className="min-h-full flex flex-col font-sans"
        style={{
          '--brand-primary': primaryColor,
          '--brand-secondary': secondaryColor,
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
