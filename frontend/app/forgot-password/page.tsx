"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import LivenessCapture from "@/components/liveness-capture";
import type { LiveCapture } from "@/lib/liveness";

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  /**
   * Como en un banco, el rostro va primero: si no coincide con el de la cuenta,
   * lanza y LivenessCapture ofrece reintentar con gestos nuevos.
   */
  const handleBiometricVerify = async (capture: LiveCapture) => {
    setError("");
    const res = await fetch(`${API_URL}/auth/biometric-reset/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...capture }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "La verificación biométrica no fue exitosa"));
    const result = await res.json();
    setResetToken(result.resetToken);
    setBiometricScore(result.matchScore);
    setStep(3);
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
                    Antes de cambiar tu contraseña confirmaremos que eres el titular: sigue las instrucciones en
                    pantalla. Tu rostro se comparará con el que verificó tu identidad al registrarte.
                  </p>
                </div>

                <LivenessCapture purpose="PASSWORD_RESET" onComplete={handleBiometricVerify} />
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
