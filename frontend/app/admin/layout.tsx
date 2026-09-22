import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LayoutDashboard, CreditCard, PieChart, Building, Users, LogOut } from "lucide-react";

async function verifySession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  
  if (!accessToken && !refreshToken) {
    return false;
  }

  // Build cookie string to forward
  const cookieHeader = [
    accessToken ? `access_token=${accessToken}` : '',
    refreshToken ? `refresh_token=${refreshToken}` : ''
  ].filter(Boolean).join('; ');

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/me`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return false;
    }
    const user = await res.json();
    return user.role === "ADMIN";
  } catch (error) {
    return false;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await verifySession();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#003b70] text-white flex flex-col shadow-2xl shrink-0 sticky top-0 h-screen">
        <div className="h-20 flex items-center px-6 border-b border-blue-900/50">
          <Link href="/admin" className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#35b8db]" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none">ADMINISTRACIÓN</span>
              <span className="font-light text-xs text-blue-200 mt-1">Coop. Ambato</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </Link>
          <Link href="/admin/credits" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <CreditCard className="w-5 h-5" />
            <span className="font-medium text-sm">Tipos de Crédito</span>
          </Link>
          <Link href="/admin/indirect-fees" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <PieChart className="w-5 h-5" />
            <span className="font-medium text-sm">Cargos Indirectos</span>
          </Link>
          <Link href="/admin/investments" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <PieChart className="w-5 h-5" />
            <span className="font-medium text-sm">Pólizas</span>
          </Link>
          <Link href="/admin/institution" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Building className="w-5 h-5" />
            <span className="font-medium text-sm">Institución</span>
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Users className="w-5 h-5" />
            <span className="font-medium text-sm">Usuarios</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-blue-900/50">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top bar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h2 className="text-xl font-bold text-slate-800">Panel de Control</h2>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <span className="font-bold text-[#003b70]">A</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Administrador</span>
              <span className="text-xs text-slate-500">admin@admin.com</span>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <div className="p-8">
          {children}
        </div>
      </main>

    </div>
  );
}
