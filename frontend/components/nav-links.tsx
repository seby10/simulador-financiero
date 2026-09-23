"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { User, LogOut } from "lucide-react";

export default function NavLinks() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  return (
    <nav 
      className="hidden md:flex items-center gap-8 font-semibold text-sm"
      style={{ color: 'var(--brand-navbar-text, #1e293b)' }}
    >
      <Link 
        href="/" 
        className={`transition-colors py-7 border-b-2 ${pathname === "/" ? "text-brand-secondary border-brand-secondary" : "border-transparent hover:border-brand-secondary hover:text-brand-secondary"}`}
      >
        INICIO
      </Link>
      <Link 
        href="/investments" 
        className={`transition-colors py-7 border-b-2 ${pathname.startsWith("/investments") ? "text-brand-secondary border-brand-secondary" : "border-transparent hover:border-brand-secondary hover:text-brand-secondary"}`}
      >
        INVERSIONES
      </Link>
      <Link 
        href="/simulator" 
        className={`transition-colors py-7 border-b-2 ${pathname.startsWith("/simulator") ? "text-brand-secondary border-brand-secondary" : "border-transparent hover:border-brand-secondary hover:text-brand-secondary"}`}
      >
        CRÉDITOS
      </Link>
      {currentUser && currentUser.role === "CUSTOMER" && (
        <Link 
          href="/my-applications" 
          className={`transition-colors py-7 border-b-2 ${pathname.startsWith("/my-applications") ? "text-brand-secondary border-brand-secondary" : "border-transparent hover:border-brand-secondary hover:text-brand-secondary"}`}
        >
          MIS SOLICITUDES
        </Link>
      )}
      
      <div className="ml-4 pl-8 border-l border-slate-200/40">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200">
              <User className="w-3.5 h-3.5 text-brand-primary" />
              {currentUser.firstName || currentUser.fullName?.split(" ")[0] || "Cliente"}
            </span>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link 
            href="/login" 
            className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2 shadow-sm"
          >
            Banca Virtual
          </Link>
        )}
      </div>
    </nav>
  );
}
