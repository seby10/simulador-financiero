"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [institution, setInstitution] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/institution`)
      .then(r => r.json())
      .then(data => setInstitution(data))
      .catch(e => console.error(e));
  }, []);

  return (
    <>
      <header className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {institution?.logoUrl ? (
              <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${institution.logoUrl}`} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 rounded bg-brand-primary flex items-center justify-center text-white shadow-md">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <div className="flex flex-col">
              {institution?.institutionName ? (
                <span className="font-extrabold text-xl tracking-tight text-brand-primary uppercase leading-none mt-1">
                  {institution.institutionName}
                </span>
              ) : (
                <>
                  <span className="font-bold text-xl tracking-tight text-brand-primary leading-none mt-1">
                    COOPERATIVA
                  </span>
                  <span className="font-extrabold text-2xl tracking-tighter text-brand-primary leading-none">
                    AMBATO
                  </span>
                </>
              )}
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm text-brand-primary">
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
            
            <div className="ml-4 pl-8 border-l border-slate-200">
              <Link 
                href="/login" 
                className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2"
              >
                Banca Virtual
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
