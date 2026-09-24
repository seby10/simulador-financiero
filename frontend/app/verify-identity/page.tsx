"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  IdCard,
  Lock,
  ScanFace,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LivenessCapture from "@/components/liveness-capture";
import ContinueOnPhone, { createHandoff } from "@/components/continue-on-phone";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import { IDENTITY_PATH, needsIdentity, type IdentityStatus, type SessionUser } from "@/lib/identity";
import type { LiveCapture } from "@/lib/liveness";

interface IdentityState {
  status: IdentityStatus;
  hasDocument: boolean;
  remainingAttempts: number;
  maxAttempts: number;
}

type Step = "loading" | "document" | "face" | "done" | "locked";

async function loadState(): Promise<{ user: SessionUser; identity: IdentityState } | null> {
  const me = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
  if (!me.ok) return null;
  const user: SessionUser = await me.json();
  const res = await fetch(`${API_URL}/identity`, { credentials: "include" });
  if (!res.ok) throw new Error(await readApiError(res, "No pudimos consultar tu verificación"));
  return { user, identity: await res.json() };
}

function VerifyIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [step, setStep] = useState<Step>("loading");
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const [consent, setConsent] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadState()
      .then((state) => {
        if (!state) {
          router.replace(`/login?redirect=${encodeURIComponent(IDENTITY_PATH)}`);
          return;
        }
        if (!needsIdentity(state.user)) {
          router.replace(state.user.role === "ADMIN" ? "/admin" : redirect);
          return;
        }
        setIdentity(state.identity);
        setStep(state.identity.status === "LOCKED" ? "locked" : "document");
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [router, redirect]);

  // La vista previa de la cédula es un object URL: se libera al cambiarla.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickDocument = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("La cédula debe ser una foto JPG o PNG.");
      return;
    }
    setError("");
    setDocument(file);
    setPreview(URL.createObjectURL(file));
  };

  const submitDocument = async () => {
    if (!consent) {
      setError("Debes aceptar el tratamiento de tus datos biométricos para continuar.");
      return;
    }
    setError("");
    if (!document) {
      if (identity?.hasDocument) {
        setStep("face");
        return;
      }
      setError("Carga una foto del lado frontal de tu cédula.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("idFront", document);
      const res = await fetch(`${API_URL}/identity/document`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) throw new Error(await readApiError(res, "No pudimos guardar la foto de tu cédula"));
      setIdentity(await res.json());
      setStep("face");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /** Si no pasa, lanza con el motivo: LivenessCapture lo muestra y ofrece reintentar. */
  const submitFace = async (capture: LiveCapture) => {
    setError("");
    const res = await fetch(`${API_URL}/identity/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...capture, consent }),
    });
    if (res.status === 429) {
      setStep("locked");
      return;
    }
    if (!res.ok) throw new Error(await readApiError(res, "No pudimos verificar tu identidad"));
    const result: IdentityState & { passed: boolean; failureReason: string | null } = await res.json();
    setIdentity(result);
    if (result.passed) {
      setStep("done");
    } else if (result.status === "LOCKED") {
      setStep("locked");
    } else {
      throw new Error(
        `${result.failureReason ?? "No pudimos confirmar que eres el titular de la cédula"}. Te quedan ${result.remainingAttempts} intento(s).`,
      );
    }
  };

  const stepNumber = step === "face" ? 2 : step === "done" ? 3 : 1;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Navbar />
      <main className="flex-1 flex items-start justify-center p-4 pb-12 relative z-10">
        <div className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl shadow-amber-900/10 border border-amber-200/50 overflow-hidden">
          <div className="bg-[#14183e] text-white px-7 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#f1a501]">Acción necesaria</p>
            <h1 className="text-2xl font-black font-serif-title mt-1">Confirma tu identidad</h1>
            <p className="text-sm text-white/70 mt-1">
              Para proteger tu cuenta, igual que en un banco, validamos que eres el titular comparando tu rostro con tu
              cédula. Hasta completarlo no podrás solicitar productos.
            </p>
            <div className="flex gap-2 mt-5 text-xs font-bold">
              {["Cédula", "Rostro", "Listo"].map((label, i) => (
                <span
                  key={label}
                  className={`px-3 py-1 rounded-full ${
                    stepNumber === i + 1 ? "bg-white text-[#14183e]" : stepNumber > i + 1 ? "bg-emerald-500" : "bg-white/10 text-white/60"
                  }`}
                >
                  {i + 1}. {label}
                </span>
              ))}
            </div>
          </div>

          <div className="p-7 space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {step === "loading" && !error && (
              <p className="text-center text-sm text-slate-500 py-10">Cargando...</p>
            )}

            {step === "document" && (
              <div className="space-y-5">
                <div>
                  <p className="font-bold text-[#14183e] flex items-center gap-2">
                    <IdCard className="w-5 h-5 text-[#df6951]" /> Foto del lado frontal de tu cédula
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Nítida, completa y sin reflejos. Se usa solo para comparar tu rostro.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 hover:border-[#df6951] rounded-[24px] p-5 text-center transition-colors"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- object URL local
                    <img src={preview} alt="Cédula" className="max-h-48 mx-auto rounded-xl object-contain" />
                  ) : (
                    <span className="text-slate-500 text-sm flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6" />
                      {identity?.hasDocument ? "Ya cargaste tu cédula. Toca para reemplazarla." : "Toca para seleccionar la foto (JPG o PNG)"}
                    </span>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => pickDocument(e.target.files?.[0])}
                />
                <label className="flex items-start gap-3 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-[#df6951]"
                  />
                  <span>
                    Autorizo el tratamiento de mis datos biométricos (imagen facial y de mi cédula) únicamente para
                    verificar mi identidad, conforme a la Ley Orgánica de Protección de Datos Personales.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={submitDocument}
                  disabled={busy}
                  className="w-full py-3 rounded-full bg-[#df6951] hover:bg-[#c85640] text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-60"
                >
                  {busy ? "Guardando..." : "Continuar"}
                </button>
              </div>
            )}

            {step === "face" && (
              <div className="space-y-4">
                <p className="font-bold text-[#14183e] flex items-center gap-2">
                  <ScanFace className="w-5 h-5 text-[#df6951]" /> Verificación facial en vivo
                </p>
                <p className="text-xs text-slate-500">
                  Comprobaremos que eres una persona real y el titular de la cédula. Intentos disponibles:{" "}
                  {identity?.remainingAttempts}.
                </p>
                <LivenessCapture purpose="IDENTITY" onComplete={submitFace} />
                <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" /> ¿Sin cámara en esta computadora? <span className="h-px flex-1 bg-slate-200" />
                </div>
                <ContinueOnPhone
                  create={() => createHandoff("/biometrics/handoff", { purpose: "IDENTITY", consent })}
                  onCompleted={(result) => setStep(result.passed ? "done" : "locked")}
                />
                <button
                  type="button"
                  onClick={() => setStep("document")}
                  className="text-xs font-semibold text-slate-500 hover:text-[#df6951]"
                >
                  Cambiar la foto de la cédula
                </button>
              </div>
            )}

            {step === "done" && (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <h2 className="text-xl font-black text-[#14183e]">Identidad confirmada</h2>
                <p className="text-sm text-slate-500">Tu cuenta ya está habilitada para operar.</p>
                <button
                  type="button"
                  onClick={() => router.push(redirect)}
                  className="px-8 py-3 rounded-full bg-[#14183e] text-white font-bold text-sm inline-flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Continuar
                </button>
              </div>
            )}

            {step === "locked" && (
              <div className="text-center py-6 space-y-3">
                <Lock className="w-14 h-14 text-[#df6951] mx-auto" />
                <h2 className="text-xl font-black text-[#14183e]">Verificación en revisión</h2>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Se agotaron los intentos de verificación facial. Un asesor revisará tu cuenta y te habilitará nuevos
                  intentos. Si necesitas ayuda, comunícate con la institución.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function VerifyIdentityPage() {
  return (
    <Suspense>
      <VerifyIdentityContent />
    </Suspense>
  );
}
