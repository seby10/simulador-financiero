import { BiometricsScanner } from "@/components/biometrics-scanner";
import { Building2, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Banking Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">
                BANCO<span className="text-blue-400">FINANCIERO</span>
              </span>
              <span className="hidden sm:inline-block ml-3 text-[11px] px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                Banca en Línea
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span className="hidden md:flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Canal Encriptado SSL 256-bit
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page Title & Breadcrumb */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Verificación de Identidad Digital
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Paso de seguridad requerido para validar la titularidad de tu solicitud de Crédito o Inversión.
          </p>
        </div>

        {/* Biometrics Scanner Component */}
        <BiometricsScanner />
      </main>

      {/* Banking Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-slate-600 text-xs mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Banco Financiero S.A. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Políticas de Privacidad</span>
            <span>•</span>
            <span>Seguridad Bancaria</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
