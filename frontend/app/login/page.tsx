"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import { identityUrl, needsIdentity } from "@/lib/identity";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register state
  const [idNumber, setIdNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error(await readApiError(res, "Credenciales incorrectas"));

      const session = await res.json();
      if (needsIdentity(session.user)) {
        // Registro a medias: la identidad sigue pendiente, se retoma ahí.
        router.push(identityUrl(redirectUrl));
      } else if (session.user.role === "ADMIN" && !searchParams.get("redirect")) {
        router.push("/admin");
      } else {
        router.push(redirectUrl);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (idNumber.length !== 10) {
      setError("La cédula debe contener exactamente 10 dígitos.");
      setLoading(false);
      return;
    }

    if (regPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError("Debes aceptar los Términos y Condiciones para crear una cuenta.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          idNumber,
          firstName,
          lastName,
          email: regEmail,
          phone,
          address,
          password: regPassword,
        }),
      });

      if (!res.ok) throw new Error(await readApiError(res, "Error al crear la cuenta"));

      // La sesión ya quedó abierta; la cuenta se habilita al confirmar la identidad.
      router.push(identityUrl(redirectUrl));
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
        <div className="w-full max-w-lg bg-brand-card-bg rounded-[32px] shadow-2xl shadow-amber-900/10 overflow-hidden border border-amber-200/50 my-0 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Card Header Banner */}
            <div className="bg-gradient-to-b from-[#f7e6c5] to-[#f4dfb7] p-8 sm:p-9 text-center flex flex-col items-center justify-center relative overflow-hidden border-b border-[#e2c999]">
              <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center mb-3 border border-amber-200 shadow-md shadow-amber-900/5 backdrop-blur-md">
                <Lock className="w-8 h-8 text-brand-secondary" />
              </div>
              <h1 className="text-2xl sm:text-[28px] font-bold font-serif-title tracking-tight text-brand-primary mb-1.5">
                Banca Virtual
              </h1>
              <p className="text-[#5e6282] text-xs sm:text-sm max-w-xs font-normal leading-relaxed">
                {mode === "login" ? "Accede a tus simulaciones, solicitudes y pólizas" : "Crea tu cuenta de cliente en pocos pasos"}
              </p>

              {/* Mode Switcher Pills */}
              <div className="flex bg-white/70 p-1.5 rounded-full mt-6 w-full max-w-xs border border-amber-200/80 backdrop-blur-md shadow-sm justify-between items-center px-1.5">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                    mode === "login" 
                      ? "bg-brand-secondary text-white shadow-md shadow-brand-secondary/20" 
                      : "text-[#5e6282] hover:text-brand-primary"
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                    mode === "register" 
                      ? "bg-brand-accent text-white shadow-md shadow-brand-accent/20" 
                      : "text-[#5e6282] hover:text-brand-primary"
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-7 sm:p-10 space-y-6">
              {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm border border-red-200 font-medium animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <p>{error}</p>
                </div>
              )}

              {mode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Correo Electrónico
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-brand-secondary transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary focus:bg-brand-card-bg outline-none text-slate-800 text-sm font-semibold transition-all shadow-sm"
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282]">
                        Contraseña
                      </label>
                      <Link href="/forgot-password" className="text-xs font-bold text-brand-secondary hover:underline">
                        ¿Olvidaste tu clave?
                      </Link>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-brand-secondary transition-colors" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary focus:bg-brand-card-bg outline-none text-slate-800 text-sm font-semibold transition-all shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-secondary hover:bg-brand-secondary-dark text-white py-4 rounded-full font-bold text-sm sm:text-base shadow-xl shadow-brand-secondary/25 hover:shadow-2xl hover:shadow-brand-secondary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 group disabled:opacity-70 mt-3"
                  >
                    {loading ? "Iniciando sesión..." : "Ingresar a mi cuenta"}
                    {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </button>

                  <div className="text-center pt-3">
                    <p className="text-xs text-slate-500">
                      ¿No tienes una cuenta aún?{" "}
                      <button 
                        type="button" 
                        onClick={() => setMode("register")} 
                        className="text-brand-accent font-bold hover:underline"
                      >
                      Regístrate gratis
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Cédula *</label>
                    <input
                      type="text"
                      maxLength={10}
                      required
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      placeholder="1710034065"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Celular *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      placeholder="0991234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Nombres *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      placeholder="María José"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      placeholder="Andrade"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                    placeholder="maria.andrade@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Dirección *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                    placeholder="Av. Amazonas N24-100 y Colón"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Contraseña *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1.5">Confirmar *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded text-brand-accent focus:ring-brand-accent w-4 h-4"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      Acepto los <span className="font-bold text-slate-800">Términos y Condiciones</span> de tratamiento de datos personales.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-accent hover:bg-brand-accent-dark text-white py-4 rounded-full font-bold text-base shadow-lg shadow-brand-accent/25 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-3"
                >
                  {loading ? "Creando cuenta..." : "Crear mi Cuenta de Cliente"}
                  {!loading && <UserCheck className="w-5 h-5" />}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    ¿Ya posees una cuenta?{" "}
                    <button 
                      type="button" 
                      onClick={() => setMode("login")} 
                      className="text-brand-secondary font-bold hover:underline"
                    >
                      Iniciar Sesión
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
