"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Lock, Monitor, ShieldCheck } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LivenessCapture, { type LivenessPhase } from "@/components/liveness-capture";
import { API_URL, errorMessage, readApiError } from "@/lib/api";
import type { LiveCapture, LivenessPurpose } from "@/lib/liveness";

interface MobileInfo {
  purpose: LivenessPurpose;
  firstName: string | null;
  completed: boolean;
  expiresAt: string;
}

type Phase = "loading" | "capture" | "done" | "locked" | "expired";
type MobileStage = "CONNECTED" | "CAPTURING" | "VERIFYING";

/** Latido para que la computadora sepa que el celular sigue en la página. */
const HEARTBEAT_MS = 2000;

const handoffUrl = (token: string) => `${API_URL}/biometrics/handoff/mobile/${encodeURIComponent(token)}`;

/** Avisa a la computadora en qué paso va el celular (sin esperar respuesta). */
function sendStage(token: string, stage: MobileStage) {
  void fetch(`${handoffUrl(token)}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
    keepalive: true,
  }).catch(() => undefined);
}

const TITLES: Record<LivenessPurpose, { title: string; subtitle: string; done: string }> = {
  IDENTITY: {
    title: "Confirma tu identidad",
    subtitle: "Comprobaremos que eres una persona real y el titular de la cédula que cargaste.",
    done: "Tu identidad quedó confirmada. Vuelve a tu computadora: continuará automáticamente.",
  },
  PASSWORD_RESET: {
    title: "Recupera tu contraseña",
    subtitle: "Antes de cambiar tu clave necesitamos confirmar que eres el titular de la cuenta.",
    done: "Verificamos tu rostro. Vuelve a tu computadora para crear tu nueva contraseña.",
  },
  APPLICATION: {
    title: "Verifica tu solicitud",
    subtitle: "Compararemos tu rostro con la cédula de tu solicitud de inversión.",
    done: "Verificación completada. Vuelve a tu computadora para finalizar tu solicitud.",
  },
};

async function fetchInfo(token: string): Promise<MobileInfo | null> {
  const res = await fetch(handoffUrl(token));
  if (res.status === 410) return null;
  if (!res.ok) throw new Error(await readApiError(res, "No pudimos abrir la verificación"));
  return res.json();
}

/**
 * Verificación facial en el celular, abierta desde el QR de la computadora. El
 * resultado lo guarda el servidor y la computadora continúa sola al detectarlo.
 */
function VerifyMobileContent() {
  const token = useSearchParams().get("t") ?? "";
  const [info, setInfo] = useState<MobileInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const stage = useRef<MobileStage>("CONNECTED");

  // Mientras se verifica: latidos periódicos y aviso inmediato si se cierra la
  // página (pagehide también cubre cambiar de app en iOS y cerrar la pestaña).
  useEffect(() => {
    if (phase !== "capture" || !token) return;
    const beat = setInterval(() => sendStage(token, stage.current), HEARTBEAT_MS);
    const leave = () => navigator.sendBeacon(`${handoffUrl(token)}/leave`);
    const back = (event: PageTransitionEvent) => {
      if (event.persisted) sendStage(token, stage.current);
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", back);
    return () => {
      clearInterval(beat);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", back);
    };
  }, [phase, token]);

  /** Cada fase de la captura se refleja al instante en la computadora. */
  const reportPhase = (next: LivenessPhase) => {
    const mapped: MobileStage = next === "intro" ? "CONNECTED" : next === "sending" ? "VERIFYING" : "CAPTURING";
    if (mapped === stage.current) return;
    stage.current = mapped;
    sendStage(token, mapped);
  };

  useEffect(() => {
    if (!token) return;
    fetchInfo(token)
      .then((data) => {
        if (!data) {
          setPhase("expired");
          return;
        }
        setInfo(data);
        setPhase(data.completed ? "done" : "capture");
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [token]);

  /** Si no pasa, lanza con el motivo: LivenessCapture lo muestra y permite reintentar. */
  const submit = async (capture: LiveCapture) => {
    const res = await fetch(`${handoffUrl(token)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capture),
    });
    if (res.status === 410) {
      setPhase("expired");
      return;
    }
    if (res.status === 429) {
      setPhase("locked");
      return;
    }
    if (!res.ok) throw new Error(await readApiError(res, "No pudimos verificar tu identidad"));
    const result: { passed: boolean; failureReason: string | null; remainingAttempts: number | null; locked: boolean } =
      await res.json();
    if (result.passed) {
      setPhase("done");
    } else if (result.locked) {
      setPhase("locked");
    } else {
      const attempts = result.remainingAttempts === null ? "" : ` Te quedan ${result.remainingAttempts} intento(s).`;
      throw new Error(`${(result.failureReason ?? "No pudimos confirmar tu identidad").replace(/\.$/, "")}.${attempts}`);
    }
  };

  const copy = info ? TITLES[info.purpose] : null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Navbar />
      <main className="flex-1 w-full max-w-md mx-auto p-4 space-y-4 relative z-10">
        {!token && (
          <Notice icon={Monitor} title="Abre este enlace desde el código QR">
            Inicia la verificación en tu computadora y elige “Continuar en mi celular” para obtener el código.
          </Notice>
        )}

        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-4">{error}</p>}

        {token && phase === "loading" && !error && <p className="text-center text-sm text-slate-500 py-16">Cargando...</p>}

        {phase === "capture" && copy && info && (
          <>
            <div className="pt-2">
              {info.firstName && <p className="text-sm text-slate-500">Hola, {info.firstName}</p>}
              <h1 className="text-2xl font-black font-serif-title text-[#14183e]">{copy.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{copy.subtitle}</p>
            </div>
            <div className="bg-white rounded-[28px] shadow-xl shadow-slate-900/5 border border-slate-100 p-4">
              <LivenessCapture purpose={info.purpose} onComplete={submit} onPhaseChange={reportPhase} />
            </div>
            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Código de un solo uso, válido por 10 minutos.
            </p>
          </>
        )}

        {phase === "done" && (
          <Notice icon={CheckCircle2} title="¡Listo!" tone="success">
            {copy?.done ?? "La verificación ya se completó. Puedes volver a tu computadora."}
          </Notice>
        )}

        {phase === "locked" && (
          <Notice icon={Lock} title="Verificación en revisión" tone="warning">
            Se agotaron los intentos de verificación facial. Un asesor revisará tu caso; vuelve a tu computadora para
            ver el estado.
          </Notice>
        )}

        {phase === "expired" && (
          <Notice icon={Clock} title="El código venció" tone="warning">
            Por seguridad cada código dura 10 minutos y sirve para una sola verificación. Genera uno nuevo desde tu
            computadora.
          </Notice>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Notice({
  icon: Icon,
  title,
  tone = "info",
  children,
}: {
  icon: typeof Monitor;
  title: string;
  tone?: "info" | "success" | "warning";
  children: React.ReactNode;
}) {
  const color = tone === "success" ? "text-emerald-500" : tone === "warning" ? "text-[#df6951]" : "text-[#14183e]";
  return (
    <div className="bg-white rounded-[28px] shadow-xl shadow-slate-900/5 border border-slate-100 p-8 text-center space-y-3 mt-6">
      <Icon className={`w-14 h-14 mx-auto ${color}`} />
      <h1 className="text-xl font-black text-[#14183e]">{title}</h1>
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

export default function VerifyMobilePage() {
  return (
    <Suspense>
      <VerifyMobileContent />
    </Suspense>
  );
}
