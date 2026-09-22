"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Credenciales incorrectas");
      }

      const session = await res.json();
      
      // The backend sets httpOnly cookies for the tokens.
      // We just need to route to the admin panel.
      if (session.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        // Normal user dashboard (not built yet)
        router.push("/");
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          
          <div className="bg-brand-primary p-8 text-white flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-900/50 backdrop-blur-3xl z-0"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20 backdrop-blur-md">
                <Lock className="w-8 h-8 text-brand-secondary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Banca Virtual</h1>
              <p className="text-blue-200 text-sm mt-2 text-center">
                Ingresa tus credenciales para administrar la cooperativa
              </p>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 text-sm border border-red-100 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-transparent outline-none transition-all text-slate-700"
                    placeholder="admin@cooperativa.ec"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                  <a href="#" className="text-xs text-brand-secondary hover:underline">¿Olvidaste tu clave?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-transparent outline-none transition-all text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Iniciando sesión..." : "Ingresar a mi cuenta"}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
