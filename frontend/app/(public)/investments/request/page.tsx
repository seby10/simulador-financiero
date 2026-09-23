"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import Modal from "@/components/ui/modal";
import {
  User,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Upload,
  Camera,
  RefreshCw,
  FileCheck,
  XCircle,
  Check,
  AlertCircle,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: "Datos Personales", icon: User },
  { id: 2, label: "Documentos", icon: FileText },
  { id: 3, label: "Verificacion Biometrica", icon: ShieldCheck },
  { id: 4, label: "Confirmacion", icon: CheckCircle2 },
];

function FileUploadBox({
  label, file, onFile, accept = "image/jpeg,image/png,application/pdf", hint = "JPG, PNG o PDF - max 5 MB", required = false,
}: { label: string; file: File | null; onFile: (f: File) => void; accept?: string; hint?: string; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-colors ${
          file ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-brand-secondary hover:bg-slate-50"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
          </div>
        ) : (
          <div className="text-slate-400">
            <Upload className="w-6 h-6 mx-auto mb-1" />
            <p className="text-xs">Haz clic para seleccionar archivo</p>
            <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

function InvestmentRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const planId = searchParams.get("planId");
  const amount = searchParams.get("amount");
  const termDays = searchParams.get("termDays");
  const payoutMethod = searchParams.get("payoutMethod") || "AT_MATURITY";

  const [form, setForm] = useState({
    applicantFullName: "",
    applicantIdNumber: "",
    email: "",
    phone: "",
    sourceOfFunds: "",
    investmentPlanId: planId ? Number(planId) : 0,
    amount: amount || "",
    termDays: termDays ? Number(termDays) : 0,
    payoutMethod: payoutMethod,
  });

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          const currentUrl = window.location.pathname + window.location.search;
          router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
          return null;
        }
        return res.json();
      })
      .then((user) => {
        if (user) {
          setForm((f) => ({
            ...f,
            applicantFullName: user.fullName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : f.applicantFullName),
            applicantIdNumber: user.idNumber || f.applicantIdNumber,
            email: user.email || f.email,
            phone: user.phone || f.phone,
          }));
        }
      })
      .catch(() => {});
  }, [router]);

  const [docIdFront, setDocIdFront] = useState<File | null>(null);
  const [docIdBack, setDocIdBack] = useState<File | null>(null);
  const [docUtilityBill, setDocUtilityBill] = useState<File | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"camera" | "file">("camera");
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricPassed, setBiometricPassed] = useState(false);
  const [biometricScore, setBiometricScore] = useState<number | null>(null);
  /** Se agotaron los intentos: la solicitud sigue, con revision manual de identidad. */
  const [manualReview, setManualReview] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const bioFileRef = useRef<HTMLInputElement | null>(null);

  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "info" }>({
    isOpen: false, title: "", message: "", type: "info",
  });
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState("");

  // Al salir de la pagina se libera la camara (solo toca el stream, no el estado).
  useEffect(() => () => mediaStreamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setCameraError("No fue posible activar la camara. Puedes cargar una fotografia.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
      stopCamera();
    }
  };

  const handleBioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCapturedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const executeBiometric = async () => {
    if (!capturedImage || !applicationId) return;
    setIsVerifying(true);
    setStepError("");
    try {
      const res = await fetch(`${API_URL}/biometrics/applications/${applicationId}/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieBase64: capturedImage }),
      });
      if (res.status === 429) {
        setManualReview(true);
        throw new Error("Se agotaron los intentos. Un asesor revisara tu identidad con los documentos cargados.");
      }
      if (!res.ok) throw new Error(await readApiError(res, "Error al validar la identidad"));
      const data: {
        passed: boolean;
        matchScore: string;
        biometricStatus: "PENDING" | "VERIFIED" | "FAILED";
        remainingAttempts: number;
        failureReason: string | null;
      } = await res.json();
      setBiometricPassed(data.passed);
      setBiometricScore(Math.round(Number(data.matchScore)));
      setRemainingAttempts(data.remainingAttempts);
      if (data.biometricStatus === "FAILED") {
        setManualReview(true);
        setStepError("No fue posible verificar tu rostro y se agotaron los intentos. Un asesor revisara tu identidad con los documentos cargados.");
      } else if (!data.passed) {
        setStepError(`${data.failureReason || "Verificacion fallida."} Te quedan ${data.remainingAttempts} intento(s).`);
      }
    } catch (err) {
      setStepError(errorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/onboarding/apply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          investmentPlanId: Number(form.investmentPlanId),
          termDays: Number(form.termDays),
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Error al enviar solicitud"));
      const data = await res.json();
      setApplicationId(data.id);
      setStep(2);
    } catch (err) {
      setStepError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError("");
    if (!docIdFront || !docIdBack) {
      setStepError("Debes subir la cedula (frontal y reverso).");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("idFront", docIdFront);
      formData.append("idBack", docIdBack);
      if (docUtilityBill) formData.append("utilityBill", docUtilityBill);
      const res = await fetch(`${API_URL}/onboarding/${applicationId}/documents`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error(await readApiError(res, "Error al subir documentos"));
      setStep(3);
    } catch (err) {
      setStepError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStep3Finish = () => {
    if (!biometricPassed && !manualReview) {
      setStepError("La verificacion biometrica no fue exitosa. Intenta de nuevo.");
      return;
    }
    setStepError("");
    setStep(4);
  };

  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors" style={{ backgroundColor: "var(--brand-page-bg, #f8fafc)" }}>
      <Navbar />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} message={modal.message} type={modal.type} />

      <div className="bg-brand-primary text-white pt-10 pb-20 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Solicitud de Inversion</h1>
        <p className="text-blue-200 max-w-xl mx-auto text-sm">
          Completa los pasos a continuacion para formalizar tu poliza de inversion.
        </p>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 -mt-12 pb-16">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-brand-primary text-white shadow-md" : "bg-slate-100 text-slate-400"
                    }`}>
                      {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-semibold hidden sm:block ${active ? "text-brand-primary" : done ? "text-emerald-600" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 transition-colors ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-brand-primary px-6 py-4 text-white">
            <h2 className="font-bold text-lg">{STEPS[step - 1]?.label}</h2>
            <p className="text-blue-200 text-sm">Paso {step} de {STEPS.length}</p>
          </div>

          <div className="p-6 md:p-8">
            {stepError && (
              <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{stepError}</p>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                    <input required value={form.applicantFullName} onChange={e => setForm({ ...form, applicantFullName: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm"
                      placeholder="Ej: Maria Jose Andrade" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cedula de Identidad <span className="text-red-500">*</span></label>
                    <input required value={form.applicantIdNumber} onChange={e => setForm({ ...form, applicantIdNumber: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm"
                      placeholder="10 digitos" maxLength={10} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Telefono <span className="text-red-500">*</span></label>
                    <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm"
                      placeholder="0991234567" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electronico <span className="text-red-500">*</span></label>
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm"
                      placeholder="ejemplo@correo.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Origen de los Fondos <span className="text-red-500">*</span></label>
                    <input required value={form.sourceOfFunds} onChange={e => setForm({ ...form, sourceOfFunds: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm"
                      placeholder="Ej: Ahorros de relacion de dependencia" />
                  </div>
                  {!planId && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Monto a Invertir (USD) <span className="text-red-500">*</span></label>
                        <input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Plazo (Dias) <span className="text-red-500">*</span></label>
                        <input required type="number" value={form.termDays} onChange={e => setForm({ ...form, termDays: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-sm" />
                      </div>
                    </>
                  )}
                  {planId && (
                    <div className="md:col-span-2 bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-200">
                      <p className="font-semibold text-slate-800 mb-2">Datos de tu Simulacion</p>
                      <div className="flex flex-wrap gap-4">
                        <span>Monto: <strong>${Number(amount).toLocaleString()}</strong></span>
                        <span>Plazo: <strong>{termDays} dias</strong></span>
                        <span>Modalidad: <strong>{payoutMethod === "MONTHLY" ? "Pago Mensual" : "Al Vencimiento"}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={saving}
                    className="bg-brand-secondary hover:bg-brand-secondary/90 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow transition-all disabled:opacity-70">
                    {saving ? "Enviando..." : "Continuar"} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-5">
                <p className="text-sm text-slate-500 mb-2">Sube los documentos requeridos. Los archivos son confidenciales y encriptados.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FileUploadBox label="Cedula - Parte Frontal" file={docIdFront} onFile={setDocIdFront} accept="image/jpeg,image/png" hint="Foto JPG o PNG (se compara con tu rostro) - max 5 MB" required />
                  <FileUploadBox label="Cedula - Parte Reverso" file={docIdBack} onFile={setDocIdBack} required />
                  <div className="md:col-span-2">
                    <FileUploadBox label="Planilla de Servicio Basico (Opcional)" file={docUtilityBill} onFile={setDocUtilityBill} />
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => { setStepError(""); setStep(1); }}
                    className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                    Atras
                  </button>
                  <button type="submit" disabled={saving}
                    className="bg-brand-secondary hover:bg-brand-secondary/90 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow transition-all disabled:opacity-70">
                    {saving ? "Subiendo..." : "Continuar"} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <p className="font-semibold mb-1">Verificacion de identidad biometrica</p>
                    <p className="text-xs text-blue-700">Toma una foto clara de tu rostro sin gafas ni mascarilla. El sistema comparara tu fotografia con los documentos subidos.</p>
                  </div>
                </div>

                <div className="flex border-b border-slate-200 text-xs font-medium">
                  <button onClick={() => { setInputMode("camera"); if (!capturedImage) startCamera(); }}
                    className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all ${inputMode === "camera" ? "border-brand-primary text-brand-primary font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                    <Camera className="w-4 h-4" /> Camara Web
                  </button>
                  <button onClick={() => { setInputMode("file"); stopCamera(); }}
                    className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all ${inputMode === "file" ? "border-brand-primary text-brand-primary font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                    <Upload className="w-4 h-4" /> Cargar Foto
                  </button>
                </div>

                <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-300 flex items-center justify-center">
                  {capturedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <img src={capturedImage} alt="Rostro capturado" className="w-full h-full object-contain" />
                      {isVerifying && (
                        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white text-center p-4">
                          <div className="w-9 h-9 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                          <p className="text-xs font-semibold">Validando identidad...</p>
                        </div>
                      )}
                      {biometricPassed && !isVerifying && (
                        <div className="absolute inset-0 bg-emerald-900/70 flex flex-col items-center justify-center text-white">
                          <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2" />
                          <p className="font-bold">Identidad Verificada</p>
                          <p className="text-xs text-emerald-200">Puntaje: {biometricScore}%</p>
                        </div>
                      )}
                    </div>
                  ) : inputMode === "camera" ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                      {!cameraActive && (
                        <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                          {cameraError ? (
                            <div className="text-sm text-red-600 flex flex-col items-center gap-2">
                              <XCircle className="w-8 h-8" /><p>{cameraError}</p>
                            </div>
                          ) : (
                            <div className="text-slate-400">
                              <Camera className="w-10 h-10 mx-auto mb-2" />
                              <p className="text-sm">Presiona el boton para activar la camara</p>
                            </div>
                          )}
                        </div>
                      )}
                      {cameraActive && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-60 rounded-[50%] border-2 border-brand-secondary shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 w-full h-full">
                      <Upload className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-700 mb-1">Selecciona una foto de tu rostro</p>
                      <p className="text-xs text-slate-400 mb-4">Formatos: JPG, PNG</p>
                      <button onClick={() => bioFileRef.current?.click()} className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm">
                        Buscar Fotografia
                      </button>
                      <input ref={bioFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleBioFileUpload} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {manualReview ? null : capturedImage && !biometricPassed ? (
                    <>
                      <button onClick={() => { setCapturedImage(null); setBiometricPassed(false); if (inputMode === "camera") startCamera(); }} disabled={isVerifying}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-all disabled:opacity-50">
                        <RefreshCw className="w-4 h-4" /> Repetir Foto
                      </button>
                      <button onClick={executeBiometric} disabled={isVerifying}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50">
                        <FileCheck className="w-4 h-4" />
                        {isVerifying ? "Validando..." : "Confirmar y Validar"}
                      </button>
                    </>
                  ) : !capturedImage && inputMode === "camera" ? (
                    <button onClick={() => cameraActive ? capturePhoto() : startCamera()}
                      className="flex-1 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow">
                      <Camera className="w-4 h-4" />
                      {cameraActive ? "Tomar Foto" : "Iniciar Camara"}
                    </button>
                  ) : null}
                </div>

                {biometricPassed && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Identidad verificada correctamente. Puntaje: {biometricScore}%
                  </div>
                )}

                {remainingAttempts !== null && !biometricPassed && !manualReview && (
                  <p className="text-xs text-slate-500">Intentos restantes: {remainingAttempts}</p>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => { setStepError(""); setStep(2); stopCamera(); }}
                    className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                    Atras
                  </button>
                  <button onClick={handleStep3Finish} disabled={!biometricPassed && !manualReview}
                    className="bg-brand-secondary hover:bg-brand-secondary/90 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Finalizar Solicitud <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-10 space-y-6">
                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Solicitud Enviada!</h3>
                  <p className="text-slate-500 max-w-md mx-auto text-sm">
                    {manualReview
                      ? "Tu solicitud fue recibida. Como no fue posible verificar tu rostro, un asesor revisara tu identidad con los documentos antes de decidir."
                      : "Tu identidad fue verificada y tu solicitud esta en revision por nuestro equipo. Puedes seguir su estado en Mis Solicitudes."}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-sm mx-auto text-sm">
                  <p className="font-semibold text-slate-700 mb-2">Detalles de tu solicitud:</p>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>N de Solicitud:</span>
                      <span className="font-mono text-xs font-medium">{applicationId?.slice(0, 18)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estado:</span>
                      <span className="font-bold text-amber-600">En Revision</span>
                    </div>
                  </div>
                </div>
                <Link href="/my-applications"
                  className="inline-block bg-brand-primary hover:bg-brand-primary/90 text-white px-8 py-3 rounded-xl font-bold shadow transition-all">
                  Ver Mis Solicitudes
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function InvestmentRequestPage() {
  return (
    <Suspense>
      <InvestmentRequestContent />
    </Suspense>
  );
}
