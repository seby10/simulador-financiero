"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Lock, Mail, AlertCircle, ArrowRight, UserCheck, ShieldCheck, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/navbar";
import { API_URL } from "@/lib/api";

function LoginContent() {
  const router = Router();
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

  function Router() {
    return useRouter();
  }

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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Credenciales incorrectas");
      }

      const session = await res.json();
      if (session.user.role === "ADMIN" && !searchParams.get("redirect")) {
        router.push("/admin");
      } else {
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err.message);
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
          fullName: `${firstName} ${lastName}`.trim(),
          email: regEmail,
          phone,
          address,
          password: regPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message || "Error al crear la cuenta";
        throw new Error(msg);
      }

      // Automatically logged in by backend cookie
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 my-4">
          
          {/* Header */}
          <div className="bg-brand-primary p-6 text-white flex flex-col items-center justify-center relative overflow-hidden text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 border border-white/20 backdrop-blur-md">
              <Lock className="w-6 h-6 text-brand-secondary" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Banca Virtual & Clientes</h1>
            <p className="text-blue-200 text-xs mt-1">
              {mode === "login" ? "Ingresa tus credenciales para acceder a tus solicitudes" : "Regístrate para solicitar pólizas de inversión"}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl mt-4 w-full max-w-xs border border-white/10">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === "login" ? "bg-white text-brand-primary shadow" : "text-blue-100 hover:text-white"}`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === "register" ? "bg-white text-brand-primary shadow" : "text-blue-100 hover:text-white"}`}
              >
                Crear Cuenta
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-600">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-700 text-sm font-medium"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase text-slate-600">Contraseña</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-700 text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {loading ? "Iniciando sesión..." : "Ingresar a mi cuenta"}
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    ¿No tienes una cuenta aún?{" "}
                    <button type="button" onClick={() => setMode("register")} className="text-brand-secondary font-bold hover:underline">
                      Regístrate gratis
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600">Cédula *</label>
                    <input
                      type="text"
                      maxLength={10}
                      required
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-secondary outline-none"
                      placeholder="1710034065"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600">Celular *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                      placeholder="0991234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600">Nombres *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                      placeholder="María José"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600">Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                      placeholder="Andrade"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                    placeholder="maria.andrade@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">Dirección *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                    placeholder="Av. Amazonas N24-100 y Colón"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600">Contraseña *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600">Confirmar Contraseña *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-secondary outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-secondary"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      Acepto los <span className="font-bold text-slate-800">Términos y Condiciones</span> de tratamiento de datos personales y servicios financieros.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-secondary hover:bg-brand-secondary/90 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-2"
                >
                  {loading ? "Creando cuenta..." : "Crear mi Cuenta de Cliente"}
                  {!loading && <UserCheck className="w-5 h-5" />}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    ¿Ya posees una cuenta?{" "}
                    <button type="button" onClick={() => setMode("login")} className="text-brand-primary font-bold hover:underline">
                      Iniciar Sesión
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
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
