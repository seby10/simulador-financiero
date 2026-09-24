"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import { identityUrl, needsIdentity } from "@/lib/identity";
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

import Footer from "@/components/footer";

function FileUploadBox({
  label, file, onFile, accept = "image/jpeg,image/png,application/pdf", hint = "JPG, PNG o PDF - máx 5 MB", required = false,
}: { label: string; file: File | null; onFile: (f: File) => void; accept?: string; hint?: string; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
        {label} {required && <span className="text-[#df6951]">*</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-[24px] p-6 cursor-pointer text-center transition-all ${
          file ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 hover:border-[#f1a501] hover:bg-amber-50/30"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm truncate max-w-[220px]">{file.name}</span>
          </div>
        ) : (
          <div className="text-slate-400 space-y-1">
            <Upload className="w-7 h-7 mx-auto mb-2 text-[#f1a501]" />
            <p className="text-xs font-bold text-[#14183e]">Haz clic para seleccionar archivo</p>
            <p className="text-xs text-slate-400">{hint}</p>
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
        if (user && needsIdentity(user)) {
          router.push(identityUrl(window.location.pathname + window.location.search));
          return;
        }
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
      setCameraError("No fue posible activar la cámara. Puedes cargar una fotografía.");
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
        throw new Error("Se agotaron los intentos. Un asesor revisará tu identidad con los documentos cargados.");
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
        setStepError("No fue posible verificar tu rostro y se agotaron los intentos. Un asesor revisará tu identidad con los documentos cargados.");
      } else if (!data.passed) {
        setStepError(`${data.failureReason || "Verificación fallida."} Te quedan ${data.remainingAttempts} intento(s).`);
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
      if (res.status === 403) {
        router.push(identityUrl(window.location.pathname + window.location.search));
        return;
      }
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
      setStepError("Debes subir la cédula (frontal y reverso).");
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
      setStepError("La verificación biométrica no fue exitosa. Intenta de nuevo.");
      return;
    }
    setStepError("");
    setStep(4);
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 flex flex-col bg-transparent relative">
      <Navbar />
      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} message={modal.message} type={modal.type} />

      {/* Header Banner */}
      <div className="pt-10 pb-8 text-center max-w-3xl mx-auto px-4 relative z-10">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#f1a501] mb-2">
          SOLICITUD DE INVERSIÓN
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14183e] font-serif-title leading-tight mb-4">
          Formaliza tu Póliza DPF
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
          Completa los 4 sencillos pasos a continuación para aperturar tu certificado de depósito a plazo fijo de forma 100% digital.
        </p>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pb-20 relative z-10">
        {/* Step Wizard Header */}
        <div className="bg-white rounded-[24px] shadow-lg border border-slate-100 p-4 sm:p-6 mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                        ? "bg-[#14183e] text-white ring-4 ring-amber-100"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs sm:text-sm font-bold hidden md:block ${
                      active ? "text-[#14183e]" : done ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-3 sm:mx-4 rounded-full transition-colors ${
                      done ? "bg-emerald-400" : "bg-slate-100"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content Card */}
        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-[#14183e] px-6 py-5 text-white flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-xl font-serif-title">{STEPS[step - 1]?.label}</h2>
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Paso {step} de {STEPS.length}</p>
            </div>
            <span className="w-3 h-3 rounded-full bg-[#f1a501] animate-pulse" />
          </div>

          <div className="p-6 sm:p-10">
            {stepError && (
              <div className="mb-6 flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{stepError}</p>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Nombre Completo <span className="text-[#df6951]">*</span>
                    </label>
                    <input required value={form.applicantFullName} onChange={e => setForm({ ...form, applicantFullName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-medium text-[#14183e]"
                      placeholder="Ej: María José Andrade" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Cédula de Identidad <span className="text-[#df6951]">*</span>
                    </label>
                    <input required value={form.applicantIdNumber} onChange={e => setForm({ ...form, applicantIdNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-mono font-medium text-[#14183e]"
                      placeholder="10 dígitos" maxLength={10} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Teléfono Móvil <span className="text-[#df6951]">*</span>
                    </label>
                    <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-medium text-[#14183e]"
                      placeholder="0991234567" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Correo Electrónico <span className="text-[#df6951]">*</span>
                    </label>
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-medium text-[#14183e]"
                      placeholder="ejemplo@correo.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Origen de los Fondos <span className="text-[#df6951]">*</span>
                    </label>
                    <input required value={form.sourceOfFunds} onChange={e => setForm({ ...form, sourceOfFunds: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-medium text-[#14183e]"
                      placeholder="Ej: Ahorros personales de relación de dependencia" />
                  </div>
                  {!planId && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                          Monto a Invertir (USD) <span className="text-[#df6951]">*</span>
                        </label>
                        <input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-medium text-[#14183e]" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                          Plazo (Días) <span className="text-[#df6951]">*</span>
                        </label>
                        <input required type="number" value={form.termDays} onChange={e => setForm({ ...form, termDays: Number(e.target.value) })}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#f1a501] focus:border-transparent outline-none text-sm font-medium text-[#14183e]" />
                      </div>
                    </>
                  )}
                  {planId && (
                    <div className="md:col-span-2 bg-amber-50/60 rounded-2xl p-5 text-sm border border-amber-200/80">
                      <p className="font-extrabold text-[#14183e] font-serif-title text-base mb-2">Datos de tu Simulación</p>
                      <div className="flex flex-wrap gap-6 text-[#14183e]">
                        <span>Monto: <strong className="font-mono text-base">${Number(amount).toLocaleString()}</strong></span>
                        <span>Plazo: <strong>{termDays} días</strong></span>
                        <span>Modalidad: <strong>{payoutMethod === "MONTHLY" ? "Pago Mensual" : "Al Vencimiento"}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving}
                    className="bg-[#df6951] hover:bg-[#c85640] text-white px-8 py-3.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.02] transition-all text-sm disabled:opacity-70">
                    {saving ? "Enviando..." : "Continuar Paso 2"} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-6">
                <p className="text-sm text-slate-600 mb-2">Sube los documentos requeridos. Los archivos son estrictamente confidenciales y encriptados.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploadBox label="Cédula - Parte Frontal" file={docIdFront} onFile={setDocIdFront} accept="image/jpeg,image/png" hint="Fotografía JPG o PNG (utilizada para biometría facial) - máx 5 MB" required />
                  <FileUploadBox label="Cédula - Parte Reverso" file={docIdBack} onFile={setDocIdBack} required />
                  <div className="md:col-span-2">
                    <FileUploadBox label="Planilla de Servicio Básico (Opcional)" file={docUtilityBill} onFile={setDocUtilityBill} />
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <button type="button" onClick={() => { setStepError(""); setStep(1); }}
                    className="px-6 py-3 rounded-full font-bold text-[#14183e] bg-slate-100 hover:bg-slate-200 transition-colors text-sm">
                    Atrás
                  </button>
                  <button type="submit" disabled={saving}
                    className="bg-[#df6951] hover:bg-[#c85640] text-white px-8 py-3.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.02] transition-all text-sm disabled:opacity-70">
                    {saving ? "Subiendo..." : "Continuar Paso 3"} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-sm text-[#14183e] flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 shrink-0 text-[#f1a501] mt-0.5" />
                  <div>
                    <p className="font-extrabold font-serif-title text-base mb-1">Verificación de Identidad Biométrica</p>
                    <p className="text-xs text-slate-600 leading-relaxed">Toma una foto clara de tu rostro sin gafas ni mascarilla. Nuestro algoritmo de Inteligencia Artificial comparará tu captura en vivo contra tu documento de identidad.</p>
                  </div>
                </div>

                <div className="flex border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <button onClick={() => { setInputMode("camera"); if (!capturedImage) startCamera(); }}
                    className={`pb-3 px-5 flex items-center gap-2 border-b-2 transition-all ${inputMode === "camera" ? "border-[#f1a501] text-[#14183e]" : "border-transparent text-slate-400 hover:text-slate-700"}`}>
                    <Camera className="w-4 h-4 text-[#f1a501]" /> Cámara Web
                  </button>
                  <button onClick={() => { setInputMode("file"); stopCamera(); }}
                    className={`pb-3 px-5 flex items-center gap-2 border-b-2 transition-all ${inputMode === "file" ? "border-[#f1a501] text-[#14183e]" : "border-transparent text-slate-400 hover:text-slate-700"}`}>
                    <Upload className="w-4 h-4 text-[#f1a501]" /> Cargar Foto
                  </button>
                </div>

                <div className="relative aspect-[4/3] w-full bg-[#14183e] rounded-[24px] overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
                  {capturedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <img src={capturedImage} alt="Rostro capturado" className="w-full h-full object-contain" />
                      {isVerifying && (
                        <div className="absolute inset-0 bg-[#14183e]/85 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-4">
                          <div className="w-10 h-10 border-4 border-[#f1a501] border-t-transparent rounded-full animate-spin mb-3" />
                          <p className="text-sm font-bold font-serif-title">Validando tu Rostro...</p>
                        </div>
                      )}
                      {biometricPassed && !isVerifying && (
                        <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                          <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2" />
                          <p className="font-extrabold font-serif-title text-xl">¡Identidad Verificada!</p>
                          <p className="text-xs text-emerald-300 font-mono mt-1">Match Biométrico: {biometricScore}%</p>
                        </div>
                      )}
                    </div>
                  ) : inputMode === "camera" ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                      {!cameraActive && (
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                          {cameraError ? (
                            <div className="text-sm text-rose-400 flex flex-col items-center gap-2">
                              <XCircle className="w-10 h-10" /><p>{cameraError}</p>
                            </div>
                          ) : (
                            <div className="text-slate-400 space-y-2">
                              <Camera className="w-12 h-12 mx-auto mb-2 text-[#f1a501]" />
                              <p className="text-sm font-semibold text-white">Presiona el botón para activar la cámara web</p>
                            </div>
                          )}
                        </div>
                      )}
                      {cameraActive && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-52 h-64 rounded-[50%] border-2 border-[#f1a501] shadow-[0_0_0_9999px_rgba(20,24,62,0.6)]" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 w-full h-full">
                      <Upload className="w-12 h-12 text-[#f1a501] mb-2" />
                      <p className="text-base font-bold text-[#14183e] mb-1">Selecciona una foto nítida de tu rostro</p>
                      <p className="text-xs text-slate-400 mb-4">Formatos permitidos: JPG, PNG</p>
                      <button onClick={() => bioFileRef.current?.click()} className="px-6 py-2.5 rounded-full bg-white border border-slate-300 hover:bg-slate-100 text-[#14183e] font-bold text-xs shadow-sm transition-all">
                        Buscar Fotografía
                      </button>
                      <input ref={bioFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleBioFileUpload} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {manualReview ? null : capturedImage && !biometricPassed ? (
                    <>
                      <button onClick={() => { setCapturedImage(null); setBiometricPassed(false); if (inputMode === "camera") startCamera(); }} disabled={isVerifying}
                        className="px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-[#14183e] font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50">
                        <RefreshCw className="w-4 h-4" /> Repetir Foto
                      </button>
                      <button onClick={executeBiometric} disabled={isVerifying}
                        className="flex-1 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50">
                        <FileCheck className="w-4 h-4" />
                        {isVerifying ? "Validando..." : "Confirmar y Validar Biometría"}
                      </button>
                    </>
                  ) : !capturedImage && inputMode === "camera" ? (
                    <button onClick={() => cameraActive ? capturePhoto() : startCamera()}
                      className="flex-1 py-3.5 rounded-full bg-[#14183e] hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all">
                      <Camera className="w-4 h-4 text-[#f1a501]" />
                      {cameraActive ? "Capturar Fotografía" : "Iniciar Cámara"}
                    </button>
                  ) : null}
                </div>

                {biometricPassed && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-semibold flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span>Identidad verificada exitosamente. Score de concordancia: <strong>{biometricScore}%</strong></span>
                  </div>
                )}

                {remainingAttempts !== null && !biometricPassed && !manualReview && (
                  <p className="text-xs text-slate-500 text-center font-medium">Intentos restantes de validación: {remainingAttempts}</p>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button onClick={() => { setStepError(""); setStep(2); stopCamera(); }}
                    className="px-6 py-3 rounded-full font-bold text-[#14183e] bg-slate-100 hover:bg-slate-200 transition-colors text-sm">
                    Atrás
                  </button>
                  <button onClick={handleStep3Finish} disabled={!biometricPassed && !manualReview}
                    className="bg-[#df6951] hover:bg-[#c85640] text-white px-8 py-3.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.02] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    Finalizar Solicitud <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="text-center py-10 space-y-6">
                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-extrabold text-[#14183e] font-serif-title mb-2">¡Solicitud Registrada con Éxito!</h3>
                  <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                    {manualReview
                      ? "Tu solicitud fue recibida. Como no fue posible verificar tu rostro automáticamente, un oficial de crédito revisará tu identidad manualmente."
                      : "Tu identidad fue auditada correctamente y tu póliza DPF se encuentra en proceso de formalización. Puedes consultar su avance en tiempo real."}
                  </p>
                </div>
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-6 text-left max-w-md mx-auto text-sm space-y-3">
                  <p className="font-extrabold text-[#14183e] font-serif-title text-base border-b border-amber-200/60 pb-2">Resumen de Solicitud:</p>
                  <div className="space-y-2 text-[#14183e] font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">N° de Registro:</span>
                      <span className="font-mono font-bold text-xs">{applicationId?.slice(0, 18)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estado Inicial:</span>
                      <span className="font-bold text-[#f1a501] bg-amber-100 px-3 py-0.5 rounded-full text-xs">En Revisión</span>
                    </div>
                  </div>
                </div>
                <Link href="/my-applications"
                  className="inline-flex items-center gap-2 bg-[#df6951] hover:bg-[#c85640] text-white px-9 py-4 rounded-full font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.02] transition-all text-sm">
                  Ver Mis Solicitudes
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
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
