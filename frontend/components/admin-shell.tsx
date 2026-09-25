"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building,
  ChevronsLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Users,
  X,
} from "lucide-react";
import BrandImage from "@/components/brand-image";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/credits", label: "Tipos de Crédito", icon: CreditCard },
  { href: "/admin/indirect-fees", label: "Cargos Indirectos", icon: PieChart },
  { href: "/admin/investments", label: "Pólizas DPF", icon: PieChart },
  { href: "/admin/applications", label: "Solicitudes", icon: ClipboardList },
  { href: "/admin/institution", label: "Institución", icon: Building },
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

const COLLAPSED_KEY = "admin-sidebar-collapsed";

// Preferencia de plegado en localStorage, leída sin efectos: el servidor pinta
// la barra desplegada y el cliente la corrige al hidratar sin desajustes.
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false; // modo privado o almacenamiento bloqueado
  }
};
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const saveCollapsed = (value: boolean) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {}
  // `storage` solo salta en otras pestañas: se avisa a esta a mano.
  window.dispatchEvent(new StorageEvent("storage", { key: COLLAPSED_KEY }));
};

interface AdminShellProps {
  logoUrl?: string | null;
  institutionName?: string | null;
  user: { fullName?: string; email?: string };
  children: React.ReactNode;
}

/**
 * Marco del panel: en pantallas grandes la barra lateral se puede plegar a solo
 * iconos (se recuerda por navegador); por debajo de `lg` se oculta y se abre como
 * cajón sobre el contenido con el botón de menú.
 */
export default function AdminShell({ logoUrl, institutionName, user, children }: AdminShellProps) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Navegar cierra el cajón en móvil.
  const closeDrawer = () => setDrawerOpen(false);

  // En el cajón móvil siempre se ven las etiquetas.
  const labels = drawerOpen || !collapsed;
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);
  const initial = (user.fullName || user.email || "A").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50/70 flex font-sans text-slate-800">
      {/* Fondo del cajón móvil */}
      {drawerOpen && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-[#14183e]/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`bg-[#14183e] text-white flex flex-col shadow-2xl shrink-0 h-screen border-r border-slate-800/80
          fixed inset-y-0 left-0 z-40 w-64 transition-[transform,width] duration-200
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-0 lg:translate-x-0 ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className={`h-20 flex items-center border-b border-slate-800/80 ${labels ? "px-6 justify-between" : "justify-center"}`}>
          <Link href="/admin" className="flex items-center gap-3 min-w-0">
            <BrandImage
              url={logoUrl}
              alt="Logo"
              className="h-9 w-auto object-contain bg-white/10 rounded-lg p-1"
              fallback={
                <div className="w-10 h-10 rounded-xl bg-[#df6951] flex items-center justify-center text-white font-serif-title text-xl font-bold shadow-md shrink-0">
                  F
                </div>
              }
            />
            {labels && (
              <div className="flex flex-col">
                <span className="font-serif-title font-extrabold text-lg leading-none text-white">
                  Fiado<span className="text-[#df6951]">.</span>
                </span>
                <span className="font-bold text-[10px] text-[#f1a501] tracking-widest uppercase mt-1">
                  PANEL ADMIN
                </span>
              </div>
            )}
          </Link>
          <button
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={labels ? undefined : label}
              aria-current={isActive(href) ? "page" : undefined}
              onClick={closeDrawer}
              className={`flex items-center gap-3 py-3 rounded-xl transition-all font-medium text-sm
                ${labels ? "px-4" : "justify-center"}
                ${isActive(href) ? "bg-white/15 text-white" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive(href) ? "text-[#f1a501]" : "text-slate-400"}`} />
              {labels && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <Link
            href="/"
            title={labels ? undefined : "Volver al Sitio"}
            className={`flex items-center gap-3 py-3 text-slate-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all font-medium text-sm ${labels ? "px-4" : "justify-center"}`}
          >
            <LogOut className="w-5 h-5 text-red-400 shrink-0" />
            {labels && <span>Volver al Sitio</span>}
          </Link>
          <button
            onClick={() => saveCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Plegar menú"}
            className={`hidden lg:flex w-full items-center gap-3 py-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all text-sm ${labels ? "px-4" : "justify-center"}`}
          >
            <ChevronsLeft className={`w-5 h-5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {labels && <span>Plegar menú</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative bg-[#fefcf9]">
        <img
          src="/assets/hero/decore-shape.png"
          alt=""
          className="absolute top-0 right-0 z-0 pointer-events-none w-[420px] sm:w-[520px] lg:w-[620px] h-auto opacity-70"
        />

        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Abrir menú"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#14183e] hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#14183e] font-serif-title truncate">Panel de Control</h2>
            <span className="hidden md:inline-block bg-amber-50 text-[#f1a501] border border-amber-200/80 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              {institutionName || "Fiado Admin"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#df6951] to-[#f1a501] flex items-center justify-center text-white font-bold shadow-sm">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-bold text-xs text-[#14183e]">{user.fullName || "Administrador"}</span>
              <span className="text-[11px] text-slate-400">{user.email}</span>
            </div>
          </div>
        </header>

        {/* Sin z-index a propósito: uno aquí crearía un contexto de apilamiento y
            dejaría los modales de las páginas por debajo de la cabecera. */}
        <div className="p-4 sm:p-8 flex-1 relative">{children}</div>
      </main>
    </div>
  );
}
