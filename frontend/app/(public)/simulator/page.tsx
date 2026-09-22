import CreditSimulatorForm from "@/components/simulator/credit-simulator-form";
import Navbar from "@/components/navbar";
import { ShieldCheck, Building2 } from "lucide-react";
import { API_URL } from "@/lib/api";

export const metadata = {
  title: "Simulador de Crédito",
};

export default async function SimulatorPage() {
  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch config for simulator page", err);
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 transition-colors" style={{ backgroundColor: 'var(--brand-page-bg, #f8fafc)' }}>
      <Navbar />

      <main className="flex-1 pb-20">
        <CreditSimulatorForm />
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
