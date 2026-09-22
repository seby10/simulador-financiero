import Link from "next/link";
import { Calculator, ArrowRight, ShieldCheck, PiggyBank, Smartphone, Building2 } from "lucide-react";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Cooperativa Financiera | Inicio",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        {/* Banner with background image */}
        <div className="w-full relative bg-[#003b70] h-[400px] sm:h-[500px] overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop" 
            alt="Familia feliz" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#003b70] via-[#003b70]/80 to-transparent" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
            <div className="max-w-2xl text-white space-y-6">
              <div className="inline-block bg-[#35b8db] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
                Conectando tus sueños
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
                El respaldo financiero <br />que necesitas.
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 max-w-xl">
                Crecemos junto a ti. Solicita tu crédito hoy mismo y simula tus pagos de forma transparente.
              </p>
              <div className="pt-4 flex gap-4">
                <Link 
                  href="/simulator"
                  className="bg-[#35b8db] hover:bg-cyan-400 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2"
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
            <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#35b8db] p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-[#35b8db]/10 transition-colors">
                <Calculator className="w-8 h-8 text-[#003b70]" />
              </div>
              <h3 className="text-lg font-bold text-[#003b70] mb-2">Simulador de Crédito</h3>
              <p className="text-slate-600 text-sm mb-6">Calcula tus cuotas y descubre qué sistema de amortización te conviene más.</p>
              <Link href="/simulator" className="mt-auto text-[#35b8db] font-semibold text-sm hover:underline">Ingresar al simulador</Link>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#003b70] p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-[#003b70]/10 transition-colors">
                <PiggyBank className="w-8 h-8 text-[#003b70]" />
              </div>
              <h3 className="text-lg font-bold text-[#003b70] mb-2">Inversiones</h3>
              <p className="text-slate-600 text-sm mb-6">Haz crecer tu dinero de manera segura con nuestras excelentes tasas a plazo fijo.</p>
              <Link href="/investments/simulator" className="mt-auto text-[#003b70] font-semibold text-sm hover:underline">Conoce más</Link>
            </div>

            <div className="bg-white rounded-xl shadow-lg border-t-4 border-emerald-500 p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-emerald-50 transition-colors">
                <Smartphone className="w-8 h-8 text-[#003b70]" />
              </div>
              <h3 className="text-lg font-bold text-[#003b70] mb-2">Banca Móvil</h3>
              <p className="text-slate-600 text-sm mb-6">Realiza tus transacciones desde cualquier lugar con nuestra aplicación segura.</p>
              <a href="#" className="mt-auto text-emerald-600 font-semibold text-sm hover:underline">Descargar App</a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#003b70] text-slate-300 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white">
            <Building2 className="w-6 h-6" />
            <span className="font-bold tracking-wide">COOPERATIVA AMBATO</span>
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
