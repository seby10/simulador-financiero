import Link from "next/link";
import { CreditCard, PiggyBank, ClipboardList, ArrowRight, Building, Settings, ShieldCheck, Sparkles } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Hero Card */}
      <div className="bg-gradient-to-r from-brand-primary via-[#1c2352] to-[#252f6b] rounded-[28px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-accent border border-white/10 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Panel Administrativo
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-serif-title text-white tracking-tight">
            ¡Bienvenido a Fiado Admin!
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Administra los tipos de crédito, tasas de interés de pólizas a plazo fijo, rubros opcionales y gestiona las solicitudes de onboarding con verificación biométrica en tiempo real.
          </p>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Créditos */}
        <Link 
          href="/admin/credits" 
          className="bg-white p-7 rounded-[24px] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-secondary-soft text-brand-secondary flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
              <CreditCard className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CONFIGURACIÓN</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-primary font-serif-title mb-1">
              Tipos de Crédito
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm">
              Administra montos, plazos y tasas de interés activas.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-secondary">
            <span>Gestionar Créditos</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Pólizas */}
        <Link 
          href="/admin/investments" 
          className="bg-white p-7 rounded-[24px] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent-soft text-brand-accent flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
              <PiggyBank className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">INVERSIONES</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-primary font-serif-title mb-1">
              Pólizas DPF
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm">
              Configura planes de inversión y tasas TEA efectivas.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-accent">
            <span>Gestionar Pólizas</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Solicitudes */}
        <Link 
          href="/admin/applications" 
          className="bg-white p-7 rounded-[24px] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand-primary flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
              <ClipboardList className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ONBOARDING</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-primary font-serif-title mb-1">
              Solicitudes Recibidas
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm">
              Revisa scoring biométrico facial y aprueba solicitudes.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-primary">
            <span>Revisar Solicitudes</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

      </div>

      {/* Secondary Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Link 
          href="/admin/institution"
          className="bg-white p-6 rounded-[24px] border border-slate-200/80 hover:border-brand-secondary/40 transition-all flex items-center gap-5 shadow-sm hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-brand-primary flex items-center justify-center shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-brand-primary text-base">Datos de la Institución</h4>
            <p className="text-slate-500 text-xs">Actualiza el nombre, logotipo oficial y redes de la entidad.</p>
          </div>
        </Link>

        <Link 
          href="/admin/indirect-fees"
          className="bg-white p-6 rounded-[24px] border border-slate-200/80 hover:border-brand-accent/40 transition-all flex items-center gap-5 shadow-sm hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-brand-primary flex items-center justify-center shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-brand-primary text-base">Cargos y Rubros Indirectos</h4>
            <p className="text-slate-500 text-xs">Configura seguros obligatorios y opcionales para la amortización.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
