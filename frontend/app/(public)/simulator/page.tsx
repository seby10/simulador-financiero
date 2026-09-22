import CreditSimulatorForm from "@/components/simulator/credit-simulator-form";
import Navbar from "@/components/navbar";
import { ShieldCheck, Building2 } from "lucide-react";

export const metadata = {
  title: "Simulador de Crédito | Cooperativa Ambato",
};

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-20">
        <CreditSimulatorForm />
      </main>

      {/* Footer */}
      <footer className="bg-brand-primary text-slate-300 py-12 mt-auto">
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
