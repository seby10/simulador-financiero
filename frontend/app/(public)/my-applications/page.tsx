"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  FileText,
  PlusCircle,
  Eye,
  X,
  Printer,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Building2,
  TrendingUp,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { API_URL } from "@/lib/api";

interface InvestmentApplication {
  id: string;
  applicantFullName: string;
  applicantIdNumber: string;
  email: string;
  phone: string;
  sourceOfFunds?: string;
  amount: string;
  termDays: number;
  payoutMethod: "MONTHLY" | "AT_MATURITY";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  biometricStatus: "PENDING" | "VERIFIED" | "FAILED";
  biometricScore: string | null;
  documentUrls?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  investmentPlan: {
    id: number;
    name: string;
    tea: string;
  };
}

import Footer from "@/components/footer";

/** Estado real de la verificación facial de la solicitud (nunca se da por hecha). */
const BIOMETRIC_COPY: Record<"PENDING" | "VERIFIED" | "FAILED", { badge: string; detail: string }> = {
  VERIFIED: { badge: "Verificada", detail: "Comprobación biométrica en vivo realizada con éxito" },
  PENDING: { badge: "Pendiente", detail: "Aún no completas la verificación facial de esta solicitud" },
  FAILED: { badge: "En revisión", detail: "Un asesor revisará tu identidad con los documentos cargados" },
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<InvestmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedApp, setSelectedApp] = useState<InvestmentApplication | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          router.push("/login?redirect=/my-applications");
          return null;
        }
        return res.json();
      })
      .then((user) => {
        if (user) {
          if (user.role === "ADMIN") {
            router.push("/admin/applications");
            return;
          }
          fetchApplications();
        }
      })
      .catch(() => {
        router.push("/login?redirect=/my-applications");
      });
  }, [router]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/onboarding/my-applications`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar tus solicitudes");
      const data = await res.json();
      setApplications(data);
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancials = (app: InvestmentApplication) => {
    const amt = Number(app.amount);
    const tea = Number(app.investmentPlan.tea);
    const days = app.termDays;

    const grossInterest = amt * (tea / 100) * (days / 360);
    const withholdingRate = days >= 360 ? 0 : 2; // 2% si plazo < 360 días
    const withholding = grossInterest * (withholdingRate / 100);
    const netInterest = grossInterest - withholding;
    const totalToReceive = amt + netInterest;
    const monthlyPayment = app.payoutMethod === "MONTHLY" ? netInterest / (days / 30) : null;

    return {
      grossInterest: grossInterest.toFixed(2),
      withholdingRate: withholdingRate.toString(),
      withholding: withholding.toFixed(2),
      netInterest: netInterest.toFixed(2),
      totalToReceive: totalToReceive.toFixed(2),
      monthlyPayment: monthlyPayment ? monthlyPayment.toFixed(2) : null,
    };
  };

  const statusConfig = {
    PENDING_REVIEW: {
      label: "En Revisión",
      icon: Clock,
      badgeBg: "bg-amber-500/10 text-amber-700 border-amber-300",
      dotBg: "bg-amber-500",
      description: "Tu solicitud está siendo auditada por el comité de crédito e inversiones.",
    },
    APPROVED: {
      label: "Aprobada",
      icon: CheckCircle2,
      badgeBg: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
      dotBg: "bg-emerald-500",
      description: "¡Felicidades! Tu póliza ha sido APROBADA exitosamente.",
    },
    REJECTED: {
      label: "Rechazada",
      icon: XCircle,
      badgeBg: "bg-rose-500/10 text-rose-700 border-rose-300",
      dotBg: "bg-rose-500",
      description: "La solicitud no cumple con los parámetros mínimos requeridos.",
    },
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-transparent relative">
      <Navbar />

      <main className="flex-1 pb-20 relative z-10">
        {/* Header Banner */}
        <div className="pt-10 pb-6 text-center max-w-3xl mx-auto px-4">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#f1a501] mb-2">
            PORTAL DEL CLIENTE
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14183e] font-serif-title leading-tight mb-4">
            Mis Solicitudes de Inversión
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Consulta el estado en tiempo real, desglose de rendimientos e historial de tus pólizas a plazo fijo (DPF).
          </p>
        </div>

        {/* Main Content Area */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-2">
          {/* Top Summary Metrics (When applications exist) */}
          {!loading && !error && applications.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {/* Stat 1: Total Inverted */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#14183e]/5 flex items-center justify-center text-[#14183e] shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#5e6282] uppercase tracking-wider">Total Invertido</p>
                  <p className="text-xl sm:text-2xl font-black text-[#14183e]">
                    ${applications
                      .reduce((acc, app) => acc + Number(app.amount), 0)
                      .toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Stat 2: Total Projected Net Interest */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#5e6282] uppercase tracking-wider">Ganancia Proyectada</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600">
                    +${applications
                      .reduce((acc, app) => {
                        const fin = calculateFinancials(app);
                        return acc + Number(fin.netInterest);
                      }, 0)
                      .toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Stat 3: Total Applications */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#f1a501] shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#5e6282] uppercase tracking-wider">Pólizas Registradas</p>
                  <p className="text-xl sm:text-2xl font-black text-[#14183e]">
                    {applications.length} {applications.length === 1 ? "Solicitud" : "Solicitudes"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-8 flex-wrap gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#14183e] font-serif-title">
                Mis Pólizas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial de inversiones y certificados de depósito a plazo fijo
              </p>
            </div>
            <Link
              href="/investments"
              className="bg-[#f1a501] hover:bg-amber-600 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Inversión
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-[32px] p-16 text-center border border-slate-100 shadow-xl text-slate-500 font-medium">
              <span className="animate-spin inline-block w-8 h-8 border-3 border-[#f1a501] border-t-transparent rounded-full mb-3" />
              <p className="text-base font-semibold text-[#14183e]">Cargando tus solicitudes...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 text-center font-semibold text-sm">
              {error}
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-[32px] p-16 text-center border border-slate-100 shadow-xl space-y-5">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-[#f1a501] shadow-inner">
                <FileText className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-[#14183e] font-serif-title">No tienes solicitudes registradas</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Aún no has generado ninguna solicitud de inversión. Simula tu rendimiento y genera tu póliza hoy.
                </p>
              </div>
              <Link
                href="/investments"
                className="inline-flex items-center gap-2 bg-[#df6951] hover:bg-[#c85640] text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all text-sm"
              >
                Simular Inversión <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => {
                const config = statusConfig[app.status] || statusConfig.PENDING_REVIEW;
                const StatusIcon = config.icon;
                const fin = calculateFinancials(app);

                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-[32px] border border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                  >
                    {/* Card Body */}
                    <div className="p-6 md:p-8 space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="w-3 h-3 rounded-full bg-[#f1a501] animate-pulse" />
                            <h3 className="font-extrabold text-2xl text-[#14183e] font-serif-title">
                              {app.investmentPlan.name}
                            </h3>
                            <span className="text-xs font-bold text-[#f1a501] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                              {Number(app.investmentPlan.tea).toFixed(2)}% TEA
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            N° Solicitud: #{app.id}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${config.badgeBg}`}>
                            <StatusIcon className="w-4 h-4" />
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {/* Main Financial Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <span className="text-xs text-[#5e6282] font-bold uppercase tracking-wider block">Monto Invertido</span>
                          <p className="font-extrabold text-[#14183e] text-2xl">
                            ${Number(app.amount).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-[#5e6282] font-bold uppercase tracking-wider block">Plazo</span>
                          <p className="font-extrabold text-[#14183e] text-xl">
                            {app.termDays} días
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-[#5e6282] font-bold uppercase tracking-wider block">Interés Neto</span>
                          <p className="font-extrabold text-emerald-600 text-2xl">
                            +${Number(fin.netInterest).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-[#5e6282] font-bold uppercase tracking-wider block">Total Vencimiento</span>
                          <p className="font-black text-[#14183e] text-2xl">
                            ${Number(fin.totalToReceive).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Registrada el {new Date(app.createdAt).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</span>
                        </div>

                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-5 py-2.5 rounded-full font-bold border border-slate-200 hover:border-[#14183e] text-[#14183e] hover:bg-[#14183e] hover:text-white transition-all flex items-center justify-center gap-2 text-xs bg-slate-50 shadow-sm"
                        >
                          <Eye className="w-4 h-4" /> Ver Detalle Completo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Detail View */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#14183e]/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-[#14183e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <TrendingUp className="w-5 h-5 text-[#f1a501]" />
                </div>
                <div>
                  <h3 className="font-bold font-serif-title text-xl leading-tight">Detalle de Póliza</h3>
                  <p className="text-slate-300 text-xs font-mono">Solicitud #{selectedApp.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-300 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Status Banner */}
              {(() => {
                const config = statusConfig[selectedApp.status] || statusConfig.PENDING_REVIEW;
                const StatusIcon = config.icon;
                return (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${config.badgeBg}`}>
                    <div className="flex items-center gap-3">
                      <StatusIcon className="w-6 h-6 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wider opacity-75">Estado de Solicitud</p>
                        <p className="font-bold text-base">{config.label}</p>
                      </div>
                    </div>
                    <span className="text-xs text-right font-medium max-w-[200px] hidden sm:block">
                      {config.description}
                    </span>
                  </div>
                );
              })()}

              {/* Financial Calculation Summary Table */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5e6282] mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Resumen de Liquidación de Rendimientos
                </h4>
                {(() => {
                  const fin = calculateFinancials(selectedApp);
                  return (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Plan Seleccionado</span>
                        <span className="font-bold text-[#14183e]">{selectedApp.investmentPlan.name} ({selectedApp.investmentPlan.tea}% TEA)</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Monto Principal</span>
                        <span className="font-bold text-[#14183e] font-mono">${Number(selectedApp.amount).toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Plazo de Inversión</span>
                        <span className="font-bold text-[#14183e]">{selectedApp.termDays} Días</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Interés Bruto Ganado</span>
                        <span className="font-bold text-slate-700 font-mono">${fin.grossInterest}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Retención en la Fuente ({fin.withholdingRate}%)</span>
                        <span className="font-bold text-rose-600 font-mono">-${fin.withholding}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-600 font-bold">Interés Neto a Recibir</span>
                        <span className="font-extrabold text-emerald-600 font-mono text-base">+${fin.netInterest}</span>
                      </div>
                      {fin.monthlyPayment && (
                        <div className="flex justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-slate-600 font-bold">Pago Cuota Mensual</span>
                          <span className="font-extrabold text-[#f1a501] font-mono">${fin.monthlyPayment} / mes</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1">
                        <span className="text-[#14183e] font-black text-base">Total Final al Vencimiento</span>
                        <span className="font-black text-[#14183e] text-xl font-mono">${fin.totalToReceive}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Applicant Info */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5e6282] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#df6951]" /> Datos del Titular de la Póliza
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase">Nombres y Apellidos</span>
                    <p className="font-bold text-[#14183e]">{selectedApp.applicantFullName}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase">Cédula de Identidad</span>
                    <p className="font-bold text-[#14183e] font-mono">{selectedApp.applicantIdNumber}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase">Correo Electrónico</span>
                    <p className="font-bold text-[#14183e]">{selectedApp.email}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase">Teléfono Móvil</span>
                    <p className="font-bold text-[#14183e]">{selectedApp.phone}</p>
                  </div>
                </div>
              </div>

              {/* Biometrics */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5e6282] mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#f1a501]" /> Seguridad & Verificación Biométrica
                </h4>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-[#f1a501]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#14183e]">Validación Facial de Identidad</p>
                      <p className="text-xs text-slate-500">{BIOMETRIC_COPY[selectedApp.biometricStatus].detail}</p>
                    </div>
                  </div>
                  <span className="font-black text-[#14183e] font-mono text-base px-3 py-1 bg-white rounded-xl shadow-sm border border-amber-200">
                    {selectedApp.biometricStatus === "VERIFIED" && selectedApp.biometricScore
                      ? `${Number(selectedApp.biometricScore).toFixed(1)}% Match`
                      : BIOMETRIC_COPY[selectedApp.biometricStatus].badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer Bar */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3 shrink-0">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-full font-bold border border-slate-300 text-slate-700 hover:bg-white transition-all flex items-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-6 py-2.5 rounded-full font-bold text-white bg-[#df6951] hover:bg-[#c85640] shadow-md transition-all text-xs"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
