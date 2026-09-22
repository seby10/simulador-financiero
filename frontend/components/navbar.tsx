"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import NavLinks from "./nav-links";
import { API_URL } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [institution, setInstitution] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/institution`)
      .then(res => res.json())
      .then(data => setInstitution(data))
      .catch(err => console.error("Error fetching institution for navbar", err));
  }, []);

  return (
    <>
      <header 
        className="sticky top-0 z-50 border-b border-slate-200/80 shadow-sm transition-colors"
        style={{
          backgroundColor: 'var(--brand-navbar-bg, #ffffff)',
          color: 'var(--brand-navbar-text, #1e293b)'
        }}
      >
        <div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {institution?.logoUrl ? (
              <img src={`${API_URL?.replace('/api', '') || ''}${institution.logoUrl}`} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 rounded bg-brand-primary flex items-center justify-center text-white shadow-md">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <div className="flex flex-col">
              {institution?.institutionName ? (
                <span className="font-extrabold text-xl tracking-tight uppercase leading-none mt-1" style={{ color: 'var(--brand-primary, #003b70)' }}>
                  {institution.institutionName}
                </span>
              ) : (
                <>

                </>
              )}
            </div>
          </Link>

          <NavLinks />
        </div>
      </header>
    </>
  );
}
