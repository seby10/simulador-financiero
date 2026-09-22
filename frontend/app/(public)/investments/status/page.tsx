"use client";

import { useState } from "react";
import { Search, CheckCircle2, Clock, XCircle, ShieldCheck, ArrowRight, Building2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import Link from "next/link";

interface ApplicationStatusData {
  id: string;
  applicantFullName: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  biometricScore: string | null;
  amount: string;
  termDays: number;
  payoutMethod: "MONTHLY" | "AT_MATURITY";
  createdAt: string;
  investmentPlan: {
    id: number;
    name: string;
    tea: string;
  };
}

export default function InvestmentStatusPage() {
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApplicationStatusData | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim() || idNumber.trim().length !== 10) {
      setError("Ingresa un número de cédula válido de 10 dígitos");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    setData(null);

    try {
      const res = await fetch(`${API_URL}/onboarding/status-check/${idNumber.trim()}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("No se encontraron solicitudes registradas con ese número de cédula");
        }
        throw new Error("Error al consultar el estado de la solicitud");
      }
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Error al realizar la consulta");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    PENDING_REVIEW: {
      label: "En Revisión",
      icon: Clock,
      bg: "bg-amber-50 text-amber-800 border-amber-200",
      badgeBg: "bg-amber-100 text-amber-800",
      description: "Tu solicitud ha sido recibida y está siendo auditada por el departamento de riesgos. Te notificaremos cuando sea procesada.",
    },
    APPROVED: {
      label: "Aprobada",
      icon: CheckCircle2,
      bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      badgeBg: "bg-emerald-100 text-emerald-800",
      description: "¡Felicidades! Tu póliza de inversión ha sido APROBADA exitosamente. Un asesor financiero se pondrá en contacto contigo para formalizar la firma.",
    },
    REJECTED: {
      label: "Rechazada",
      icon: XCircle,
      bg: "bg-rose-50 text-rose-800 border-rose-200",
      badgeBg: "bg-rose-100 text-rose-800",
      description: "Tu solicitud no cumple con los criterios mínimos requeridos en esta ocasión. Para más detalles puedes contactar a soporte.",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Consulta de Estado de Póliza
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Estado de tu Solicitud de Inversión
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            Ingresa el número de cédula del titular para verificar el avance del proceso de aprobación de la póliza de inversión.
          </p>
        </div>

        {/* Form Search Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="idNumber" className="block text-sm font-semibold text-slate-700 mb-2">
                Número de Cédula de Identidad
              </label>
              <div className="relative">
                <input
                  id="idNumber"
                  type="text"
                  maxLength={10}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 1710034065"
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary text-slate-900 placeholder-slate-400 font-mono tracking-wider font-medium text-lg transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span className="hidden sm:inline">Consultar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Results */}
        {data && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden transition-all animate-fadeIn">
            {/* Status Header Bar */}
            {(() => {
              const config = statusConfig[data.status] || statusConfig.PENDING_REVIEW;
              const StatusIcon = config.icon;
              return (
                <div className={`p-6 border-b ${config.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.badgeBg}`}>
                      <StatusIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider opacity-75">Estado Actual</span>
                      <h2 className="text-2xl font-bold">{config.label}</h2>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${config.badgeBg}`}>
                    N° Solicitud: #{data.id.slice(0, 8)}
                  </span>
                </div>
              );
            })()}

            {/* Application Info */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Mensaje de estado:</p>
                <p>{statusConfig[data.status]?.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Titular</span>
                  <p className="font-bold text-slate-800 text-base">{data.applicantFullName}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Plan de Inversión</span>
                  <p className="font-bold text-slate-800 text-base">{data.investmentPlan.name} ({data.investmentPlan.tea}% TEA)</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Monto Invertido</span>
                  <p className="font-bold text-emerald-600 text-xl font-mono">${Number(data.amount).toLocaleString("es-EC", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Plazo & Pago</span>
                  <p className="font-bold text-slate-800 text-base">
                    {data.termDays} días • {data.payoutMethod === "MONTHLY" ? "Interés Mensual" : "Al Vencimiento"}
                  </p>
                </div>
              </div>

              {data.biometricScore && (
                <div className="flex items-center justify-between p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-sm text-indigo-900">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold">Puntaje Validación Biométrica Facial:</span>
                  </div>
                  <span className="font-bold font-mono text-indigo-700 text-base">{data.biometricScore}% Match</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                <span>Fecha de registro: {new Date(data.createdAt).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <Link
                  href="/investments"
                  className="inline-flex items-center gap-1.5 text-brand-primary font-bold hover:underline"
                >
                  Ir al Simulador de Inversiones <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer info box */}
        {!data && searched && !loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No se encontró información</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Asegúrate de haber ingresado correctamente tu número de cédula de 10 dígitos o de haber completado la solicitud de inversión.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
