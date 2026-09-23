"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { API_URL, errorMessage, readApiError } from "@/lib/api";

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
      if (session.user.role === "ADMIN" && !searchParams.get("redirect")) {
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

      // Automatically logged in by backend cookie
      router.push(redirectUrl);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-800 relative">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12 relative z-10">
        <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 my-4 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Card Header Banner */}
          <div className="bg-[#14183e] p-8 text-white flex flex-col items-center justify-center relative overflow-hidden text-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/15 backdrop-blur-md shadow-inner">
              <Lock className="w-7 h-7 text-[#f1a501]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-title tracking-tight text-white mb-1">
              Banca Virtual
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xs">
              {mode === "login" ? "Accede a tus simulaciones, solicitudes y pólizas" : "Crea tu cuenta de cliente en pocos pasos"}
            </p>

            {/* Mode Switcher Pills */}
            <div className="flex bg-black/30 p-1.5 rounded-full mt-6 w-full max-w-xs border border-white/10 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                  mode === "login" 
                    ? "bg-[#df6951] text-white shadow-md" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                  mode === "register" 
                    ? "bg-[#f1a501] text-white shadow-md" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-10">
            {error && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm border border-red-200 font-medium">
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
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] outline-none text-slate-800 text-sm font-semibold transition-all"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282]">
                      Contraseña
                    </label>
                    <Link href="/forgot-password" className="text-xs font-bold text-[#df6951] hover:underline">
                      ¿Olvidaste tu clave?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {loading ? "Iniciando sesión..." : "Ingresar a mi cuenta"}
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>

                <div className="text-center pt-3">
                  <p className="text-xs text-slate-500">
                    ¿No tienes una cuenta aún?{" "}
                    <button 
                      type="button" 
                      onClick={() => setMode("register")} 
                      className="text-[#f1a501] font-bold hover:underline"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none transition-all"
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
                      className="mt-0.5 rounded text-[#f1a501] focus:ring-[#f1a501] w-4 h-4"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      Acepto los <span className="font-bold text-slate-800">Términos y Condiciones</span> de tratamiento de datos personales.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#f1a501] hover:bg-amber-600 text-white py-4 rounded-full font-bold text-base shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-3"
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
                      className="text-[#df6951] font-bold hover:underline"
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
