"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-4 text-emerald-200 text-sm font-semibold max-w-md mx-auto flex items-center justify-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ¡Gracias! Te contactaremos pronto con asesoría personalizada.
      </div>
    );
  }

  return (
    <form className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto" onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ingresa tu correo electrónico" 
        required
        className="w-full px-5 py-4 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-md"
      />
      <button 
        type="submit"
        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#f1a501] hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/30 transition-all shrink-0 cursor-pointer"
      >
        Suscribirme
      </button>
    </form>
  );
}
