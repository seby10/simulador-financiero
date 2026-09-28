"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { IDENTITY_PATH, needsIdentity, type SessionUser } from "@/lib/identity";
import { User, LogOut, Menu, ShieldAlert, X } from "lucide-react";

const LINKS = [
  { href: "/simulator", label: "Créditos" },
  { href: "/investments", label: "Inversiones" },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthResolved(true));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    setCurrentUser(null);
    window.location.href = "/";
  };

  const links = authResolved && currentUser?.role === "CUSTOMER"
    ? [...LINKS, { href: "/my-applications", label: "Mis Solicitudes" }]
    : LINKS;
  const firstName = currentUser?.firstName || currentUser?.fullName?.split(" ")[0] || "Cliente";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // En la confirmación misma (computadora o celular) el aviso sobra.
  const identityPending =
    currentUser && needsIdentity(currentUser) && pathname !== IDENTITY_PATH && pathname !== "/verify-mobile";

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

        {identityPending && (
          <Link
            href={IDENTITY_PATH}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-white bg-[#df6951] hover:bg-[#c85640] px-3.5 py-2 rounded-full shadow-md animate-pulse"
            title="Confirma tu identidad para habilitar tu cuenta"
          >
            <ShieldAlert className="w-4 h-4" />
            Acción necesaria
          </Link>
        )}

        {!authResolved ? (
          <span
            aria-hidden="true"
            className="ml-2 h-8 w-28 rounded-[6px] bg-slate-100/80 animate-pulse"
          />
        ) : currentUser ? (
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

      {/* Celular: el aviso de identidad queda visible junto al botón del menú. */}
      <div className="md:hidden flex items-center gap-2">
        {identityPending && (
          <Link
            href={IDENTITY_PATH}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-white bg-[#df6951] px-3.5 py-2 rounded-full shadow-md animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            Confirma tu identidad
          </Link>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-[#181e2b] hover:bg-slate-900/5 transition-colors"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

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
          {identityPending && (
            <li>
              <Link
                href={IDENTITY_PATH}
                onClick={() => setMenuOpen(false)}
                tabIndex={menuOpen ? 0 : -1}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-[#df6951] bg-orange-50"
              >
                <ShieldAlert className="w-5 h-5" /> Confirmar mi identidad
              </Link>
            </li>
          )}
        </ul>
        <div className="mt-2 pt-3 border-t border-slate-100">
          {!authResolved ? (
            <div
              aria-hidden="true"
              className="h-11 rounded-xl bg-slate-100/80 animate-pulse"
            />
          ) : currentUser ? (
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
