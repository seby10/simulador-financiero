"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle2, XCircle, ShieldCheck, ArrowRight, FileText, PlusCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import { API_URL } from "@/lib/api";

interface InvestmentApplication {
  id: string;
  applicantFullName: string;
  applicantIdNumber: string;
  email: string;
  phone: string;
  amount: string;
  termDays: number;
  payoutMethod: "MONTHLY" | "AT_MATURITY";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  biometricScore: string | null;
  createdAt: string;
  investmentPlan: {
    id: number;
    name: string;
    tea: string;
  };
}

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<InvestmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const statusConfig = {
    PENDING_REVIEW: {
      label: "En Revisión",
      icon: Clock,
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      bgCard: "border-l-4 border-l-amber-500",
      description: "Tu solicitud está siendo auditada por el área financiera.",
    },
    APPROVED: {
      label: "Aprobada",
      icon: CheckCircle2,
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      bgCard: "border-l-4 border-l-emerald-500",
      description: "¡Felicidades! Tu póliza ha sido APROBADA exitosamente.",
    },
    REJECTED: {
      label: "Rechazada",
      icon: XCircle,
      badge: "bg-rose-100 text-rose-800 border-rose-300",
      bgCard: "border-l-4 border-l-rose-500",
      description: "La solicitud no cumple los criterios de riesgo.",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Banner */}
        <div className="bg-brand-primary text-white py-12 px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" /> Portal de Cliente
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">MIS SOLICITUDES DE INVERSIÓN</h1>
            <p className="text-blue-200 max-w-xl mx-auto text-sm md:text-base">
              Consulta en tiempo real el avance y estado de tus pólizas de inversión solicitadas.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-5xl mx-auto px-4 -mt-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Historial de Solicitudes ({applications.length})
            </h2>
            <Link
              href="/investments"
              className="bg-brand-secondary hover:bg-brand-secondary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Nueva Inversión
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm text-slate-500 font-medium">
              <span className="animate-spin inline-block w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
              <p>Cargando tus solicitudes...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 text-center font-semibold text-sm">
              {error}
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Aún no posees solicitudes</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                  Empieza a hacer crecer tu dinero. Simula y solicita tu póliza de inversión a plazo fijo en pocos pasos.
                </p>
              </div>
              <Link
                href="/investments"
                className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-3 rounded-xl font-bold shadow transition-all text-sm"
              >
                Simular Inversiones <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const config = statusConfig[app.status] || statusConfig.PENDING_REVIEW;
                const StatusIcon = config.icon;
                return (
                  <div
                    key={app.id}
                    className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all ${config.bgCard}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-extrabold text-xl text-slate-900">{app.investmentPlan.name}</h3>
                          <span className="text-xs font-bold bg-blue-50 text-brand-primary px-2.5 py-0.5 rounded-full border border-blue-100">
                            {Number(app.investmentPlan.tea).toFixed(2)}% TEA
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          N° Solicitud: #{app.id}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.badge}`}>
                          <StatusIcon className="w-4 h-4" />
                          {config.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Monto Invertido</span>
                        <p className="font-bold text-emerald-600 text-lg font-mono">
                          ${Number(app.amount).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Plazo</span>
                        <p className="font-bold text-slate-800 text-base">{app.termDays} días</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Pago Interés</span>
                        <p className="font-bold text-slate-800 text-base">
                          {app.payoutMethod === "MONTHLY" ? "Mensual" : "Al Vencimiento"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Biometría</span>
                        <p className="font-bold text-indigo-700 text-base flex items-center gap-1">
                          {app.biometricScore ? (
                            <>
                              <ShieldCheck className="w-4 h-4 text-indigo-500 inline" />
                              {Number(app.biometricScore).toFixed(1)}% Match
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs">No registrada</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
                      <p>{config.description}</p>
                      <span className="font-medium text-slate-400">
                        Fecha: {new Date(app.createdAt).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
