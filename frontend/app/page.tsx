import Link from "next/link";
import { Calculator, ArrowRight, ShieldCheck, PiggyBank, Smartphone, Building2 } from "lucide-react";
import Navbar from "@/components/navbar";
import { API_URL } from "@/lib/api";

export const metadata = {
  title: "Cooperativa Financiera | Inicio",
};

export default async function Home() {
  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch config", err);
  }

  const heroImage = config?.heroImageUrl || "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop";
  const heroTitle = config?.heroTitle || "El respaldo financiero \nque necesitas.";
  const heroSubtitle = config?.heroSubtitle || "Crecemos junto a ti. Solicita tu crédito hoy mismo y simula tus pagos de forma transparente.";

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors" style={{ backgroundColor: 'var(--brand-page-bg, #f8fafc)' }}>
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        {/* Banner with background image */}
        <div className="w-full relative bg-brand-primary h-[400px] sm:h-[500px] overflow-hidden">
          <img 
            src={heroImage} 
            alt="Hero background" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary via-brand-primary/80 to-transparent" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
            <div className="max-w-2xl text-white space-y-6">
              <div className="inline-block bg-brand-secondary text-white px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2 rounded-sm shadow-sm">
                Conectando tus sueños
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight whitespace-pre-line drop-shadow-sm">
                {heroTitle}
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 max-w-xl">
                {heroSubtitle}
              </p>
              <div className="pt-4 flex gap-4">
                <Link 
                  href="/simulator"
                  className="bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold py-3.5 px-8 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  Simular Crédito
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Services */}
        <div className="w-full max-w-7xl mx-auto px-4 -mt-12 relative z-20 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div 
              className="rounded-xl shadow-lg border-t-4 border-brand-secondary p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all"
              style={{ backgroundColor: 'var(--brand-card-bg, #ffffff)' }}
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-brand-secondary/10 transition-colors">
                <Calculator className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-brand-primary mb-2">Simulador de Crédito</h3>
              <p className="text-slate-600 text-sm mb-6">Calcula tus cuotas y descubre qué sistema de amortización te conviene más.</p>
              <Link href="/simulator" className="mt-auto text-brand-secondary font-semibold text-sm hover:underline">Ingresar al simulador</Link>
            </div>
            
            <div 
              className="rounded-xl shadow-lg border-t-4 border-brand-primary p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all"
              style={{ backgroundColor: 'var(--brand-card-bg, #ffffff)' }}
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-brand-primary/10 transition-colors">
                <PiggyBank className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-brand-primary mb-2">Inversiones</h3>
              <p className="text-slate-600 text-sm mb-6">Haz crecer tu dinero de manera segura con nuestras excelentes tasas a plazo fijo.</p>
              <Link href="/investments" className="mt-auto text-brand-primary font-semibold text-sm hover:underline">Conoce más</Link>
            </div>

            <div 
              className="rounded-xl shadow-lg border-t-4 p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all"
              style={{ 
                backgroundColor: 'var(--brand-card-bg, #ffffff)',
                borderTopColor: 'var(--brand-accent, #10b981)'
              }}
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-emerald-50 transition-colors">
                <Smartphone className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-brand-primary mb-2">Banca Móvil</h3>
              <p className="text-slate-600 text-sm mb-6">Realiza tus transacciones desde cualquier lugar con nuestra aplicación segura.</p>
              <a href="#" className="mt-auto font-semibold text-sm hover:underline" style={{ color: 'var(--brand-accent, #10b981)' }}>Descargar App</a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer 
        className="py-12 mt-auto transition-colors"
        style={{ 
          backgroundColor: 'var(--brand-footer-bg, var(--brand-primary, #003b70))',
          color: 'var(--brand-footer-text, #e2e8f0)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white">
            {config?.logoUrl ? (
              <img src={`${API_URL?.replace('/api', '')}${config.logoUrl}`} alt="Logo" className="h-6 w-auto object-contain brightness-0 invert opacity-90" />
            ) : (
              <Building2 className="w-6 h-6" />
            )}
            <span className="font-bold tracking-wide uppercase">{config?.institutionName}</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Entidad Segura y Regulada</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
