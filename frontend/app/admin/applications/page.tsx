"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import Modal from "@/components/ui/modal";
import { Eye, CheckCircle2, XCircle, Clock } from "lucide-react";

type ApplicationStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

type Application = {
  id: string;
  applicantFullName: string;
  applicantIdNumber: string;
  email: string;
  phone: string;
  sourceOfFunds: string;
  amount: string;
  termDays: number;
  payoutMethod: "AT_MATURITY" | "MONTHLY";
  status: ApplicationStatus;
  biometricScore: string | null;
  documentUrls: Record<string, string>;
  createdAt: string;
  investmentPlan: { id: number; name: string; tea: string };
};

const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string; icon: any }> = {
  PENDING_REVIEW: { label: "En Revision", color: "bg-amber-100 text-amber-700", icon: Clock },
  APPROVED:       { label: "Aprobada",    color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  REJECTED:       { label: "Rechazada",   color: "bg-red-100 text-red-700", icon: XCircle },
};

const DOC_LABELS: Record<string, string> = {
  idFront: "Cedula Frontal",
  idBack: "Cedula Reverso",
  utilityBill: "Planilla de Servicios",
  selfie: "Foto Biometrica",
};

export default function ApplicationsAdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [modal, setModal] = useState<{
    isOpen: boolean; title: string; message: string;
    type: "success" | "error" | "warning" | "info"; onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "", type: "info" });
  const [saving, setSaving] = useState(false);

  const fetchApplications = async () => {
    try {
      const url = `${API_URL}/onboarding/applications`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = (app: Application, action: "approve" | "reject") => {
    setModal({
      isOpen: true,
      title: action === "approve" ? "Aprobar solicitud" : "Rechazar solicitud",
      message: action === "approve"
        ? "Aprobara la solicitud de " + app.applicantFullName + ". Esta accion no se puede deshacer."
        : "Rechazara la solicitud de " + app.applicantFullName + ". Esta accion no se puede deshacer.",
      type: "warning",
      onConfirm: async () => {
        setSaving(true);
        setModal(m => ({ ...m, isOpen: false }));
        try {
          const res = await fetch(`${API_URL}/onboarding/applications/${app.id}/${action}`, {
            method: "POST",
            credentials: "include",
          });
          if (!res.ok) throw new Error("Error al procesar");
          setModal({ isOpen: true, title: "Exito", message: action === "approve" ? "Solicitud aprobada correctamente." : "Solicitud rechazada.", type: "success" });
          setSelectedApp(null);
          await fetchApplications();
        } catch (err: any) {
          setModal({ isOpen: true, title: "Error", message: err.message, type: "error" });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const filtered = filterStatus === "ALL" ? applications : applications.filter(a => a.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Solicitudes de Inversion</h1>
          <p className="text-slate-500 mt-1">Revisa, aprueba o rechaza las solicitudes de los clientes.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-600">Filtrar:</span>
          {(["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (filterStatus === s ? "bg-brand-primary text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
            >
              {s === "ALL" ? "Todas" : STATUS_LABELS[s as ApplicationStatus].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Solicitante</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Monto / Plazo</th>
                <th className="px-6 py-4">Biometria</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No hay solicitudes.</td></tr>
              ) : filtered.map(app => {
                const s = STATUS_LABELS[app.status];
                const SIcon = s.icon;
                return (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{app.applicantFullName}</p>
                      <p className="text-xs text-slate-500">{app.applicantIdNumber}</p>
                      <p className="text-xs text-slate-400">{app.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-brand-primary">{app.investmentPlan.name}</span>
                      <p className="text-xs text-slate-500">TEA: {Number(app.investmentPlan.tea).toFixed(2)}%</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold">${Number(app.amount).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{app.termDays} dias</p>
                    </td>
                    <td className="px-6 py-4">
                      {app.biometricScore ? (
                        <span className="text-emerald-600 font-bold">{Number(app.biometricScore).toFixed(1)}%</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Pendiente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold " + s.color}>
                        <SIcon className="w-3.5 h-3.5" />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {app.status === "PENDING_REVIEW" && (
                        <>
                          <button
                            onClick={() => handleAction(app, "approve")}
                            disabled={saving}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Aprobar"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(app, "reject")}
                            disabled={saving}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rechazar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedApp(null)}>
          <div
            className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-brand-primary px-6 py-4 text-white flex items-center justify-between sticky top-0">
              <div>
                <h3 className="font-bold text-lg">Detalle de Solicitud</h3>
                <p className="text-blue-200 text-xs font-mono">{selectedApp.id.slice(0, 18)}...</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                const s = STATUS_LABELS[selectedApp.status];
                const SIcon = s.icon;
                return (
                  <div className={"flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm " + s.color}>
                    <SIcon className="w-5 h-5" /> {s.label}
                  </div>
                );
              })()}

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Datos del Solicitante</h4>
                <div className="space-y-2 text-sm">
                  {[
                    ["Nombre", selectedApp.applicantFullName],
                    ["Cedula", selectedApp.applicantIdNumber],
                    ["Email", selectedApp.email],
                    ["Telefono", selectedApp.phone],
                    ["Origen de Fondos", selectedApp.sourceOfFunds],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Datos de la Inversion</h4>
                <div className="space-y-2 text-sm">
                  {[
                    ["Plan", selectedApp.investmentPlan.name],
                    ["TEA", Number(selectedApp.investmentPlan.tea).toFixed(2) + "%"],
                    ["Monto", "$" + Number(selectedApp.amount).toLocaleString()],
                    ["Plazo", selectedApp.termDays + " dias"],
                    ["Modalidad", selectedApp.payoutMethod === "MONTHLY" ? "Pago Mensual" : "Al Vencimiento"],
                    ["Puntaje Biometrico", selectedApp.biometricScore ? Number(selectedApp.biometricScore).toFixed(1) + "%" : "Sin datos"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Documentos Adjuntos y Foto Biométrica</h4>
                {Object.keys(selectedApp.documentUrls).length === 0 ? (
                  <p className="text-sm text-slate-400">Sin documentos cargados.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(selectedApp.documentUrls).map(([kind, url]) => {
                      const label = DOC_LABELS[kind] || kind;
                      const isSelfie = kind === "selfie";
                      return (
                        <div key={kind} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                              {isSelfie && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                              {label}
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-secondary font-bold text-xs hover:underline"
                            >
                              Abrir en nueva pestaña
                            </a>
                          </div>
                          {isSelfie ? (
                            <div className="relative rounded-lg overflow-hidden border border-emerald-200 bg-black/5 max-h-48 flex items-center justify-center">
                              <img src={url} alt="Foto Biometrica" className="object-cover h-44 w-full rounded-lg" />
                              <span className="absolute bottom-2 left-2 bg-emerald-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                Captura Facial Validada ({selectedApp.biometricScore ? Number(selectedApp.biometricScore).toFixed(1) + "%" : "100%"})
                              </span>
                            </div>
                          ) : (
                            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-2">
                              <iframe src={url} className="w-full h-32 rounded border-none pointer-events-none" title={label} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedApp.status === "PENDING_REVIEW" && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleAction(selectedApp, "reject")}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleAction(selectedApp, "approve")}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
