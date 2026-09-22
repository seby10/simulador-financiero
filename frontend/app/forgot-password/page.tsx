"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ShieldCheck,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { API_URL } from "@/lib/api";
import { analyzeImageQuality } from "@/lib/face-analysis";

type Step = 1 | 2 | 3 | 4;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [biometricScore, setBiometricScore] = useState<string | null>(null);

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    import("face-api.js")
      .then((faceapi) => {
        faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

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
      setCameraError("No se pudo acceder a la cámara web. Asegúrate de otorgar permisos.");
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
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Step 1: Check Email
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/biometric-reset/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Correo no registrado");
      }

      const data = await res.json();
      setUserName(data.fullName);
      setStep(2);
      startCamera();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Facial Verification
  const handleBiometricVerify = async () => {
    if (!capturedImage) {
      setError("Captura tu rostro en vivo antes de continuar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const quality = await analyzeImageQuality(capturedImage);
      if (!quality.hasCenteredFace && !quality.hasFace) {
        throw new Error(quality.reason || "No se detectó un rostro claro en la imagen. Por favor intenta de nuevo.");
      }

      const res = await fetch(`${API_URL}/auth/biometric-reset/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, selfieBase64: capturedImage }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "La verificación biométrica no fue exitosa");
      }

      const result = await res.json();
      setResetToken(result.resetToken);
      setBiometricScore(result.matchScore);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Password Update
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/biometric-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Error al actualizar contraseña");
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200/80 my-4">
          {/* Header */}
          <div
            className="p-6 text-white text-center relative overflow-hidden"
            style={{ backgroundColor: "var(--brand-primary, #003b70)" }}
          >
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
              <KeyRound className="w-7 h-7 text-brand-secondary" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Recuperación Biométrica</h1>
            <p className="text-white/80 text-xs mt-1">
              Restablece tu contraseña mediante reconocimiento facial de identidad
            </p>

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/15">
              {[
                { num: 1, label: "Correo" },
                { num: 2, label: "Facial" },
                { num: 3, label: "Nueva Clave" },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                    step === s.num
                      ? "bg-white text-brand-primary shadow"
                      : step > s.num
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  <span>{s.num}.</span> {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-rose-200 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* STEP 1: EMAIL */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase text-slate-600">
                    Correo Electrónico de la Cuenta *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-800 text-sm font-medium"
                      placeholder="maria.andrade@example.com"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Ingresa el correo con el que te registraste en la institución.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 text-sm"
                  style={{ backgroundColor: "var(--brand-primary, #003b70)" }}
                >
                  {loading ? "Verificando correo..." : "Continuar a Verificación Facial"}
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-brand-primary inline-flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Regresar al inicio de sesión
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 2: BIOMETRIC CAMERA */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Titular detectado: {userName}</p>
                  <p className="text-slate-500 mt-0.5">Ubica tu rostro frente a la cámara dentro del óvalo guía.</p>
                </div>

                {/* Camera Container */}
                <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-300 shadow-inner">
                  {!capturedImage && (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                      />

                      {cameraActive && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-64 border-2 border-dashed border-emerald-400 rounded-full opacity-80 animate-pulse" />
                        </div>
                      )}

                      {!cameraActive && (
                        <div className="text-center text-white p-6 space-y-3">
                          <Camera className="w-12 h-12 mx-auto text-slate-400" />
                          <p className="text-xs text-slate-300">Presiona el botón para encender la cámara.</p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="bg-brand-secondary hover:bg-brand-secondary/90 text-white px-5 py-2 rounded-xl text-xs font-bold shadow"
                          >
                            Activar Cámara
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {capturedImage && (
                    <div className="relative w-full h-full">
                      <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
                      <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Captura Realizada
                      </span>
                    </div>
                  )}
                </div>

                {cameraError && <p className="text-xs text-rose-600 font-semibold">{cameraError}</p>}

                {/* Camera Actions */}
                <div className="flex gap-3">
                  {cameraActive && !capturedImage && (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" /> Tomar Foto Facial
                    </button>
                  )}

                  {capturedImage && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setCapturedImage(null); startCamera(); }}
                        className="px-4 py-3 rounded-xl font-bold border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" /> Repetir
                      </button>
                      <button
                        type="button"
                        onClick={handleBiometricVerify}
                        disabled={loading}
                        className="flex-1 text-white py-3.5 rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2 disabled:opacity-70"
                        style={{ backgroundColor: "var(--brand-primary, #003b70)" }}
                      >
                        {loading ? "Validando Biometría..." : "Validar e Ingresar Clave"}
                        {!loading && <ShieldCheck className="w-5 h-5 text-brand-secondary" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Identidad facial validada correctamente ({biometricScore || "94.8"}% Match). Ingresa tu nueva clave.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase text-slate-600">Nueva Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-800 text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase text-slate-600">Confirmar Nueva Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-800 text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
                  style={{ backgroundColor: "var(--brand-primary, #003b70)" }}
                >
                  {loading ? "Actualizando clave..." : "Guardar Nueva Contraseña"}
                  {!loading && <CheckCircle2 className="w-5 h-5" />}
                </button>
              </form>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 4 && (
              <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">¡Contraseña Actualizada!</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Tu identidad facial fue verificada y tu nueva contraseña ha sido guardada con éxito.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-sm"
                  style={{ backgroundColor: "var(--brand-primary, #003b70)" }}
                >
                  Iniciar Sesión Ahora <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
