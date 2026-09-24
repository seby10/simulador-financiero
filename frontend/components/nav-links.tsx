"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { User, LogOut, Menu, X } from "lucide-react";

type CurrentUser = { role: string; firstName?: string | null; fullName?: string | null };

const LINKS = [
  { href: "/simulator", label: "Créditos" },
  { href: "/investments", label: "Inversiones" },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    setCurrentUser(null);
    window.location.href = "/";
  };

  const links = currentUser?.role === "CUSTOMER"
    ? [...LINKS, { href: "/my-applications", label: "Mis Solicitudes" }]
    : LINKS;
  const firstName = currentUser?.firstName || currentUser?.fullName?.split(" ")[0] || "Cliente";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav className="hidden md:flex items-center gap-10 text-sm font-normal text-[#212832]">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`relative py-2 font-medium transition-colors hover:text-[#df6951] after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#df6951] after:transition-all after:duration-300 ${
              isActive(href) ? "text-[#df6951] after:w-full" : "after:w-0 hover:after:w-full"
            }`}
          >
            {label}
          </Link>
        ))}

        {currentUser ? (
          <div className="flex items-center gap-4 ml-2">
            <span className="text-xs font-semibold text-slate-800 bg-amber-50 px-4 py-2 rounded-lg flex items-center gap-2 border border-amber-200/80">
              <User className="w-3.5 h-3.5 text-amber-600" />
              {firstName}
            </span>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              aria-label="Cerrar sesión"
              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="ml-2 border border-[#212832] text-[#212832] hover:bg-[#212832] hover:text-white font-medium text-sm px-5 py-1.5 rounded-[6px] transition-all"
          >
            Iniciar Sesión
          </Link>
        )}
      </nav>

      {/* Menú móvil */}
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="md:hidden w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-[#181e2b] hover:bg-slate-900/5 transition-colors"
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <div
        id="mobile-menu"
        className={`md:hidden absolute left-3 right-3 top-full mt-1 origin-top rounded-2xl bg-white shadow-2xl border border-slate-100 p-3 transition-all duration-200 ${
          menuOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        <ul className="flex flex-col">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMenuOpen(false)}
                tabIndex={menuOpen ? 0 : -1}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                  isActive(href) ? "bg-orange-50 text-[#df6951]" : "text-[#181e2b] hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-3 border-t border-slate-100">
          {currentUser ? (
            <div className="flex items-center justify-between px-4 py-1">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" /> {firstName}
              </span>
              <button
                onClick={handleLogout}
                tabIndex={menuOpen ? 0 : -1}
                className="text-sm font-medium text-red-500 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
              className="block text-center bg-[#181e2b] text-white font-semibold py-3 rounded-xl"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
