"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Main Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-[#003b70] flex items-center justify-center text-white shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-[#003b70] leading-none mt-1">
                COOPERATIVA
              </span>
              <span className="font-extrabold text-2xl tracking-tighter text-[#003b70] leading-none">
                AMBATO
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm text-[#003b70]">
            <Link 
              href="/" 
              className={`transition-colors py-7 border-b-2 ${pathname === "/" ? "text-[#35b8db] border-[#35b8db]" : "border-transparent hover:border-[#35b8db] hover:text-[#35b8db]"}`}
            >
              INICIO
            </Link>
            <a href="#" className="hover:text-[#35b8db] transition-colors py-7 border-b-2 border-transparent hover:border-[#35b8db]">
              NOSOTROS
            </a>
            <a href="#" className="hover:text-[#35b8db] transition-colors py-7 border-b-2 border-transparent hover:border-[#35b8db]">
              SERVICIOS
            </a>
            <Link 
              href="/simulator" 
              className={`transition-colors py-7 border-b-2 ${pathname.startsWith("/simulator") ? "text-[#35b8db] border-[#35b8db]" : "border-transparent hover:border-[#35b8db] hover:text-[#35b8db]"}`}
            >
              SIMULADOR
            </Link>
            
            <div className="ml-4 pl-8 border-l border-slate-200">
              <Link 
                href="/login" 
                className="bg-[#003b70] hover:bg-[#35b8db] text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2"
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
