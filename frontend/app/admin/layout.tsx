import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LayoutDashboard, CreditCard, PieChart, Building, Users, LogOut, ClipboardList } from "lucide-react";
import { API_URL } from "@/lib/api";

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
    const res = await fetch(`${API_URL}/auth/me`, {
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

  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch institution config", error);
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex font-sans text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#14183e] text-white flex flex-col shadow-2xl shrink-0 sticky top-0 h-screen border-r border-slate-800/80 z-20">
        
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/80">
          <Link href="/admin" className="flex items-center gap-3 group">
            {config?.logoUrl ? (
              <img src={`${API_URL?.replace('/api', '') || ''}${config.logoUrl}`} alt="Logo" className="h-9 w-auto object-contain bg-white/10 rounded-lg p-1" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#df6951] flex items-center justify-center text-white font-serif-title text-xl font-bold shadow-md">
                F
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-serif-title font-extrabold text-lg leading-none text-white">
                Fiado<span className="text-[#df6951]">.</span>
              </span>
              <span className="font-bold text-[10px] text-[#f1a501] tracking-widest uppercase mt-1">
                PANEL ADMIN
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <LayoutDashboard className="w-5 h-5 text-[#f1a501]" />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/credits" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <span>Tipos de Crédito</span>
          </Link>
          <Link href="/admin/indirect-fees" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <PieChart className="w-5 h-5 text-slate-400" />
            <span>Cargos Indirectos</span>
          </Link>
          <Link href="/admin/investments" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <PieChart className="w-5 h-5 text-slate-400" />
            <span>Pólizas DPF</span>
          </Link>
          <Link href="/admin/applications" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <ClipboardList className="w-5 h-5 text-[#df6951]" />
            <span>Solicitudes</span>
          </Link>
          <Link href="/admin/institution" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <Building className="w-5 h-5 text-slate-400" />
            <span>Institución</span>
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium text-sm">
            <Users className="w-5 h-5 text-slate-400" />
            <span>Usuarios</span>
          </Link>
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all font-medium text-sm">
            <LogOut className="w-5 h-5 text-red-400" />
            <span>Volver al Sitio</span>
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative bg-[#fefcf9]">
        
        {/* Background Decore Asset */}
        <img
          src="/assets/hero/decore-shape.png"
          alt="Decore shape"
          className="absolute top-0 right-0 z-0 pointer-events-none w-[420px] sm:w-[520px] lg:w-[620px] h-auto opacity-70"
        />

        {/* Top bar Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-[#14183e] font-serif-title">Panel de Control</h2>
            <span className="hidden sm:inline-block bg-amber-50 text-[#f1a501] border border-amber-200/80 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              {config?.institutionName || "Fiado Admin"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#df6951] to-[#f1a501] flex items-center justify-center text-white font-bold shadow-sm">
              A
            </div>
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="font-bold text-xs text-[#14183e]">Administrador</span>
              <span className="text-[11px] text-slate-400">admin@admin.com</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-6 sm:p-8 flex-1 relative z-10">
          {children}
        </div>
      </main>

    </div>
  );
}
