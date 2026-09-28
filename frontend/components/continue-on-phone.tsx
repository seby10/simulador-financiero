"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  QrCode,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Smartphone,
  WifiOff,
  X,
} from "lucide-react";
import { API_URL, readApiError } from "@/lib/api";

export interface Handoff {
  handoffId: string;
  mobileToken: string;
  pollToken: string;
  expiresAt: string;
}

interface ContinueOnPhoneProps {
  /** Abre el traspaso en la API (cada flujo usa su propio endpoint). */
  create: () => Promise<Handoff>;
  /** El celular terminó: recibe el resultado que guardó el servidor. */
  onCompleted: (result: Record<string, unknown>) => void;
}

/** Lo que el servidor informa en vivo sobre el celular. */
type LiveStatus = "WAITING" | "CONNECTED" | "CAPTURING" | "VERIFYING" | "INTERRUPTED" | "COMPLETED" | "EXPIRED";

interface LiveState {
  status: LiveStatus;
  lastFailure?: string | null;
}

/** Respaldo si el navegador o un proxy cortan los eventos en vivo. */
const FALLBACK_POLL_MS = 1500;

/** URL que abre el celular. NEXT_PUBLIC_APP_URL permite fijar la pública (túnel o dominio). */
const mobileUrl = (token: string) =>
  `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/verify-mobile?t=${encodeURIComponent(token)}`;

const isLocalOnly = () =>
  !process.env.NEXT_PUBLIC_APP_URL && ["localhost", "127.0.0.1"].includes(window.location.hostname);

const pollStatus = async (handoff: Handoff) => {
  const res = await fetch(`${API_URL}/biometrics/handoff/${handoff.handoffId}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollToken: handoff.pollToken }),
  });
  if (res.status === 404 || res.status === 410) {
    return { status: "EXPIRED" as LiveStatus, result: null };
  }
  if (!res.ok) throw new Error(await readApiError(res, "No pudimos consultar el estado"));
  return (await res.json()) as { status: LiveStatus; result: Record<string, unknown> | null };
};

const STEPS: { status: LiveStatus; label: string }[] = [
  { status: "CONNECTED", label: "Celular conectado" },
  { status: "CAPTURING", label: "Verificación facial" },
  { status: "VERIFYING", label: "Validando identidad" },
];

/**
 * "Continuar en mi celular": muestra un QR con un código temporal y sigue en vivo
 * lo que pasa en el teléfono (eventos del servidor), como en la banca en línea.
 * Si el teléfono cierra la página avisa "Proceso interrumpido"; al terminar sigue solo.
 */
export default function ContinueOnPhone({ create, onCompleted }: ContinueOnPhoneProps) {
  const [open, setOpen] = useState(false);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [live, setLive] = useState<LiveStatus | "LOADING" | "ERROR">("LOADING");
  const [lastFailure, setLastFailure] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(true);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const source = useRef<EventSource | null>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const finished = useRef(false);

  const stop = () => {
    source.current?.close();
    source.current = null;
    timers.current.forEach(clearInterval);
    timers.current = [];
  };

  // Al desmontar se cierran los eventos y los temporizadores.
  useEffect(
    () => () => {
      source.current?.close();
      timers.current.forEach(clearInterval);
    },
    [],
  );

  /** Aplica un estado en vivo; al completarse retira el resultado y continúa. */
  const apply = async (current: Handoff, state: LiveState) => {
    if (finished.current) return;
    setLive(state.status);
    if (state.lastFailure) setLastFailure(state.lastFailure);
    if (state.status === "VERIFYING") setLastFailure(null);
    if (state.status === "CONNECTED" || state.status === "CAPTURING" || state.status === "VERIFYING") setShowQr(false);
    if (state.status === "EXPIRED") stop();
    if (state.status === "COMPLETED") {
      finished.current = true;
      stop();
      const { result } = await pollStatus(current);
      setOpen(false);
      onCompleted(result ?? {});
    }
  };

  /** Si los eventos en vivo fallan, se consulta cada 1.5 s. */
  const fallBackToPolling = (current: Handoff) => {
    source.current?.close();
    source.current = null;
    timers.current.push(
      setInterval(() => {
        pollStatus(current)
          .then((state) => apply(current, state))
          .catch(() => undefined);
      }, FALLBACK_POLL_MS),
    );
  };

  const start = async () => {
    stop();
    finished.current = false;
    setOpen(true);
    setLive("LOADING");
    setShowQr(true);
    setLastFailure(null);
    setError("");
    try {
      const created = await create();
      setHandoff(created);
      setLive("WAITING");

      const expiresAt = new Date(created.expiresAt).getTime();
      setSecondsLeft(Math.round((expiresAt - Date.now()) / 1000));
      timers.current.push(setInterval(() => setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000))), 1000));

      const events = new EventSource(
        `${API_URL}/biometrics/handoff/${created.handoffId}/events?pollToken=${encodeURIComponent(created.pollToken)}`,
      );
      source.current = events;
      events.onmessage = (message) => void apply(created, JSON.parse(message.data) as LiveState);
      events.onerror = () => {
        // El servidor cierra el canal al completar; si no terminó, se pasa a consultas.
        if (!finished.current) fallBackToPolling(created);
      };
    } catch (err) {
      setLive("ERROR");
      setError(err instanceof Error ? err.message : "No pudimos generar el código");
    }
  };

  const close = () => {
    stop();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="w-full py-3 rounded-full border-2 border-brand-primary/15 hover:border-brand-primary/40 text-brand-primary font-bold text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Smartphone className="w-4 h-4 text-brand-secondary" /> Continuar en mi celular
      </button>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const onPhone = live === "CONNECTED" || live === "CAPTURING" || live === "VERIFYING";
  const stepIndex = STEPS.findIndex((step) => step.status === live);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-brand-primary flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-secondary" /> Continúa en tu celular
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Código seguro de un solo uso · vence en {minutes}:{seconds}
          </p>
        </div>
        <button type="button" onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-brand-card-bg" title="Cancelar">
          <X className="w-4 h-4" />
        </button>
      </div>

      {live === "LOADING" && <p className="text-sm text-slate-500 text-center py-6">Generando código seguro...</p>}

      {live === "ERROR" && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div>}

      {/* Esperando el escaneo (o volver a mostrarlo tras una interrupción) */}
      {handoff && showQr && (live === "WAITING" || live === "INTERRUPTED") && (
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="bg-brand-card-bg p-3 rounded-2xl shadow-sm border border-slate-200 shrink-0">
            <QRCodeSVG value={mobileUrl(handoff.mobileToken)} size={168} level="M" fgColor="#14183e" />
          </div>
          <ol className="text-sm text-slate-600 space-y-2">
            <li className="flex gap-2"><Camera className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" /> Abre la cámara de tu celular y apunta al código.</li>
            <li className="flex gap-2"><ScanFace className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" /> Sigue las instrucciones de la verificación facial.</li>
            <li className="flex gap-2 items-center font-semibold text-brand-primary">
              <span className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin shrink-0" />
              Esperando que escanees el código...
            </li>
          </ol>
        </div>
      )}

      {/* El celular está trabajando: se sigue en vivo */}
      {onPhone && (
        <div className="text-center space-y-4 py-2">
          <div className="relative w-24 h-24 mx-auto">
            <span className="absolute inset-0 rounded-full bg-brand-secondary/20 animate-ping" />
            <span className="relative w-24 h-24 rounded-full bg-brand-primary flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-white" />
            </span>
          </div>
          <div>
            <p className="font-black text-lg text-brand-primary">
              {live === "CONNECTED" && "Detectamos tu celular"}
              {live === "CAPTURING" && "Realizando la verificación en tu celular"}
              {live === "VERIFYING" && "Validando tu identidad..."}
            </p>
            <p className="text-sm text-slate-500">
              {live === "VERIFYING"
                ? "Estamos comparando tu rostro de forma segura. No cierres esta ventana."
                : "Sigue las instrucciones en tu teléfono. Esta pantalla avanzará sola al terminar."}
            </p>
          </div>
          <div className="flex justify-center gap-2 text-[11px] font-bold">
            {STEPS.map((step, i) => (
              <span
                key={step.status}
                className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                  i < stepIndex ? "bg-emerald-100 text-emerald-700" : i === stepIndex ? "bg-brand-primary text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < stepIndex && <CheckCircle2 className="w-3 h-3" />}
                {step.label}
              </span>
            ))}
          </div>
          {lastFailure && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
              Último intento en el celular: {lastFailure}. Puedes reintentarlo desde el teléfono.
            </p>
          )}
        </div>
      )}

      {/* El celular cerró la página o perdió la conexión */}
      {live === "INTERRUPTED" && !showQr && (
        <div className="text-center space-y-3 py-2">
          <WifiOff className="w-12 h-12 text-brand-secondary mx-auto" />
          <div>
            <p className="font-black text-lg text-brand-primary">Proceso interrumpido</p>
            <p className="text-sm text-slate-500">
              Se cerró la página en tu celular o se perdió la conexión. Puedes retomarlo abriendo el mismo enlace o
              escaneando el código otra vez.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="px-5 py-2.5 rounded-full bg-brand-primary text-white font-bold text-sm inline-flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" /> Mostrar el código otra vez
            </button>
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-600 font-bold text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {live === "EXPIRED" && (
        <div className="text-center space-y-3 py-2">
          <AlertTriangle className="w-10 h-10 text-brand-secondary mx-auto" />
          <p className="text-sm text-slate-600">El código venció por seguridad.</p>
        </div>
      )}

      {(live === "WAITING" || live === "INTERRUPTED") && showQr && isLocalOnly() && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Estás usando localhost: tu celular no podrá abrir el código. Abre el sitio con una dirección HTTPS accesible
          desde el teléfono (por ejemplo un túnel) o configura NEXT_PUBLIC_APP_URL.
        </p>
      )}

      {(live === "EXPIRED" || live === "ERROR") && (
        <button
          type="button"
          onClick={start}
          className="w-full py-2.5 rounded-full bg-brand-primary text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> {live === "EXPIRED" ? "Generar un código nuevo" : "Reintentar"}
        </button>
      )}

      {onPhone && (
        <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Conexión segura con tu celular
        </p>
      )}
    </div>
  );
}

/** POST a la API que devuelve un traspaso, con el mensaje de error de la API si falla. */
export async function createHandoff(path: string, body: object): Promise<Handoff> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res, "No pudimos generar el código"));
  return res.json();
}
