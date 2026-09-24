"use client";

import { useState, useRef, useEffect } from "react";
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
import Footer from "@/components/footer";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import { analyzeImageQuality } from "@/lib/face-analysis";

type Step = 1 | 2 | 3 | 4;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  useEffect(() => () => mediaStreamRef.current?.getTracks().forEach((t) => t.stop()), []);

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
    startCamera();
  };

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

      if (!res.ok) throw new Error(await readApiError(res, "La verificación biométrica no fue exitosa"));

      const result = await res.json();
      setResetToken(result.resetToken);
      setBiometricScore(result.matchScore);
      setStep(3);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
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

      if (!res.ok) throw new Error(await readApiError(res, "Error al actualizar contraseña"));

      setStep(4);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-800 relative">
      <Navbar />

      <main className="flex-1 flex items-start justify-center p-4 pt-1 sm:pt-4 pb-10 relative z-10">
        <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl shadow-amber-900/10 overflow-hidden border border-amber-200/50 my-0 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Card Header Banner */}
            <div className="bg-gradient-to-b from-[#f7e6c5] to-[#f4dfb7] p-8 sm:p-9 text-center flex flex-col items-center justify-center relative overflow-hidden border-b border-[#e2c999]">
              <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center mb-3 border border-amber-200 shadow-md shadow-amber-900/5 backdrop-blur-md">
                <KeyRound className="w-8 h-8 text-[#df6951]" />
              </div>
              <h1 className="text-2xl sm:text-[28px] font-bold font-serif-title tracking-tight text-[#181e2b] mb-1.5">
                Recuperación Biométrica
              </h1>
              <p className="text-[#5e6282] text-xs sm:text-sm max-w-xs font-normal leading-relaxed">
                Restablece tu contraseña mediante reconocimiento facial de identidad
              </p>

              {/* Step Indicators */}
              <div className="flex bg-white/70 p-1.5 rounded-full mt-6 w-full max-w-xs border border-amber-200/80 backdrop-blur-md shadow-sm justify-between items-center px-1.5">
                {[
                  { num: 1, label: "Correo" },
                  { num: 2, label: "Facial" },
                  { num: 3, label: "Nueva Clave" },
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all ${
                      step === s.num
                        ? "bg-[#df6951] text-white shadow-md shadow-orange-500/20"
                        : step > s.num
                        ? "bg-emerald-600 text-white"
                        : "text-[#5e6282]"
                    }`}
                  >
                    <span>{s.num}.</span> {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Body */}
            <div className="p-7 sm:p-10 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm border border-red-200 font-medium animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <p>{error}</p>
                </div>
              )}

              {/* STEP 1: EMAIL */}
              {step === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Correo Electrónico de la Cuenta *
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-[#df6951] transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] focus:bg-white outline-none text-slate-800 text-sm font-semibold transition-all shadow-sm"
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Ingresa el correo con el que te registraste en la institución.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#df6951] hover:bg-[#c85640] text-white py-4 rounded-full font-bold text-sm sm:text-base shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-3"
                  >
                    Continuar a Verificación Facial
                    {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </button>

                  <div className="text-center pt-3">
                    <Link href="/login" className="text-xs font-bold text-[#5e6282] hover:text-[#df6951] inline-flex items-center gap-1.5 transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Regresar al inicio de sesión
                    </Link>
                  </div>
                </form>
              )}

            {/* STEP 2: BIOMETRIC CAMERA */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/60 text-xs text-slate-700">
                  <p className="font-bold text-[#14183e] text-sm mb-1">Cuenta: {email}</p>
                  <p className="text-[#5e6282] leading-relaxed">
                    Ubica tu rostro frente a la cámara dentro del óvalo guía. Se comparará con la foto que
                    verificó tu identidad en tu registro.
                  </p>
                </div>

                {/* Camera Container */}
                <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-200 shadow-inner">
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
                          <div className="w-44 h-60 border-2 border-dashed border-[#f1a501] rounded-full opacity-80 animate-pulse shadow-lg" />
                        </div>
                      )}

                      {!cameraActive && (
                        <div className="text-center text-white p-6 space-y-3">
                          <Camera className="w-12 h-12 mx-auto text-slate-400" />
                          <p className="text-xs text-slate-300">Presiona el botón para encender la cámara web.</p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="bg-[#f1a501] hover:bg-amber-600 text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-md shadow-amber-500/20 hover:scale-[1.02] transition-all"
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
                      <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Captura Realizada
                      </span>
                    </div>
                  )}
                </div>

                {cameraError && <p className="text-xs text-red-600 font-semibold">{cameraError}</p>}

                {/* Camera Actions */}
                <div className="flex gap-3">
                  {cameraActive && !capturedImage && (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-full font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
                    >
                      <Camera className="w-5 h-5" /> Tomar Foto Facial
                    </button>
                  )}

                  {capturedImage && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setCapturedImage(null); startCamera(); }}
                        className="px-5 py-3.5 rounded-full font-bold border border-slate-200 text-[#5e6282] hover:bg-slate-100 text-xs flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" /> Repetir
                      </button>
                      <button
                        type="button"
                        onClick={handleBiometricVerify}
                        disabled={loading}
                        className="flex-1 bg-[#df6951] hover:bg-[#c85640] text-white py-4 rounded-full font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-70 hover:scale-[1.01] transition-all"
                      >
                        {loading ? "Validando Biometría..." : "Validar e Ingresar Clave"}
                        {!loading && <ShieldCheck className="w-5 h-5 text-[#f1a501]" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Identidad facial validada correctamente ({biometricScore}% de coincidencia). Ingresa tu nueva clave.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">Nueva Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] outline-none text-slate-800 text-sm font-semibold transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">Confirmar Nueva Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] outline-none text-slate-800 text-sm font-semibold transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#df6951] hover:bg-[#c85640] text-white py-4 rounded-full font-bold text-base shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-2"
                >
                  {loading ? "Actualizando clave..." : "Guardar Nueva Contraseña"}
                  {!loading && <CheckCircle2 className="w-5 h-5" />}
                </button>
              </form>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 4 && (
              <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold font-serif-title text-[#14183e]">¡Contraseña Actualizada!</h3>
                  <p className="text-[#5e6282] text-sm max-w-xs mx-auto leading-relaxed">
                    Tu identidad facial fue verificada y tu nueva contraseña ha sido guardada con éxito.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#df6951] hover:bg-[#c85640] text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.01] transition-all text-sm"
                >
                  Iniciar Sesión Ahora <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
