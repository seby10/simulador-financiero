import Link from "next/link";
import { Building2 } from "lucide-react";

export default function Navbar() {
  return (
    <>


      {/* Main Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
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
            <Link href="/" className="hover:text-[#35b8db] transition-colors py-7">INICIO</Link>
            <a href="#" className="hover:text-[#35b8db] transition-colors py-7">NOSOTROS</a>
            <a href="#" className="hover:text-[#35b8db] transition-colors py-7">SERVICIOS</a>
            <Link href="/simulator" className="text-[#35b8db] border-b-2 border-[#35b8db] py-7">SIMULADOR</Link>
          </nav>
        </div>
      </header>
    </>
  );
}
