"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

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
      <Link 
        href="/investments/status" 
        className={`transition-colors py-7 border-b-2 ${pathname.startsWith("/investments/status") ? "text-brand-secondary border-brand-secondary" : "border-transparent hover:border-brand-secondary hover:text-brand-secondary"}`}
      >
        CONSULTAR SOLICITUD
      </Link>
      
      <div className="ml-4 pl-8 border-l border-slate-200/40">
        <Link 
          href="/login" 
          className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2 shadow-sm"
        >
          Banca Virtual
        </Link>
      </div>
    </nav>
  );
}
