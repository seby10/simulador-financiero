"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { IDENTITY_PATH, needsIdentity, type SessionUser } from "@/lib/identity";
import { User, LogOut, ChevronDown, ShieldAlert } from "lucide-react";

export default function NavLinks() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

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

  // En la confirmación misma (computadora o celular) el aviso sobra.
  const identityPending =
    currentUser && needsIdentity(currentUser) && pathname !== IDENTITY_PATH && pathname !== "/verify-mobile";

  return (
    <>
    {/* En celulares la navegación se oculta: el aviso tiene que seguir visible. */}
    {identityPending && (
      <Link
        href={IDENTITY_PATH}
        className="md:hidden flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-white bg-[#df6951] px-3.5 py-2 rounded-full shadow-md animate-pulse"
      >
        <ShieldAlert className="w-4 h-4" />
        Confirma tu identidad
      </Link>
    )}
    <nav className="hidden md:flex items-center gap-10 text-sm font-normal text-[#212832]">
      <Link
        href="/simulator"
        className="hover:text-[#df6951] transition-colors py-2 font-medium"
      >
        Créditos
      </Link>
      <Link
        href="/investments"
        className="hover:text-[#df6951] transition-colors py-2 font-medium"
      >
        Inversiones
      </Link>
      {currentUser && currentUser.role === "CUSTOMER" && (
        <Link
          href="/my-applications"
          className="hover:text-[#df6951] transition-colors py-2 font-medium"
        >
          Mis Solicitudes
        </Link>
      )}

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

      {currentUser ? (
        <div className="flex items-center gap-4 ml-2">
          <span className="text-xs font-semibold text-slate-800 bg-amber-50 px-4 py-2 rounded-lg flex items-center gap-2 border border-amber-200/80">
            <User className="w-3.5 h-3.5 text-amber-600" />
            {currentUser.firstName || currentUser.fullName?.split(" ")[0] || "Cliente"}
          </span>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-10 ml-2">
          <Link
            href="/login"
            className="border border-[#212832] text-[#212832] hover:bg-[#212832] hover:text-white font-medium text-sm px-5 py-1.5 rounded-[5px] transition-all shadow-2xs"
          >
            Iniciar Sesión
          </Link>
        </div>
      )}

      {/* Language dropdown */}
      <div className="flex items-center gap-1 cursor-pointer hover:text-[#df6951] transition-colors font-medium text-sm text-[#212832]">
        <span>ES</span>
        <ChevronDown className="w-4 h-4 text-[#212832]" />
      </div>
    </nav>
    </>
  );
}


