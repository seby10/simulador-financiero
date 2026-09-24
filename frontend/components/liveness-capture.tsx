"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Glasses,
  Lightbulb,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Smile,
  VideoOff,
} from "lucide-react";
import { API_URL, readApiError } from "@/lib/api";
import {
  CHALLENGE_COPY,
  challengeMet,
  isFrontal,
  type Challenge,
  type LiveCapture,
  type LivenessPurpose,
  type LivenessSession,
} from "@/lib/liveness";

type FaceApi = typeof import("face-api.js");
type Point = { x: number; y: number };
type Phase = "intro" | "starting" | "positioning" | "challenge" | "sending" | "error";

interface LivenessCaptureProps {
  purpose: LivenessPurpose;
  /** Recibe la captura para enviarla a la API; si lanza, se muestra el error y se ofrece reintentar. */
  onComplete: (capture: LiveCapture) => Promise<void>;
}

const TICK_MS = 150;
/** Fotogramas seguidos de frente y bien encuadrado antes de tomar la referencia (~1.2 s). */
const STABLE_TICKS = 8;
/** Fotogramas seguidos mostrando el gesto antes de darlo por hecho. */
const GESTURE_TICKS = 2;
const CHALLENGE_TIMEOUT_MS = 15_000;
const FRAME_MAX_WIDTH = 720;

let faceApi: Promise<FaceApi> | undefined;

/** Modelos livianos solo para guiar (el servidor usa los suyos para decidir). */
function loadFaceApi() {
  faceApi ??= import("face-api.js").then(async (api) => {
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri("/models"),
      api.nets.faceLandmark68Net.loadFromUri("/models"),
    ]);
    return api;
  });
  return faceApi;
}

const CHALLENGE_ICON: Record<Challenge, typeof ArrowLeft> = {
  TURN_LEFT: ArrowLeft,
  TURN_RIGHT: ArrowRight,
  SMILE: Smile,
};

const TIPS = [
  { icon: Lightbulb, title: "Buena iluminación", text: "Luz de frente, sin contraluz ni sombras fuertes." },
  { icon: Glasses, title: "Rostro descubierto", text: "Sin gafas oscuras, gorra ni mascarilla." },
  { icon: Smartphone, title: "Cámara a la altura de los ojos", text: "Mantén el dispositivo quieto." },
  { icon: ScanFace, title: "Sigue las instrucciones", text: "Te pediremos dos gestos simples." },
];

/**
 * Prueba de vida guiada, como en la app de un banco: consejos, encuadre con
 * retroalimentación en vivo, dos gestos al azar pedidos por el servidor y envío
 * de los fotogramas. La cámara siempre es en vivo; no se aceptan archivos.
 */
export default function LivenessCapture({ purpose, onComplete }: LivenessCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const run = useRef({
    session: null as LivenessSession | null,
    frames: [] as string[],
    neutral: null as Point[] | null,
    stable: 0,
    hits: 0,
    index: 0,
    challengeStartedAt: 0,
  });

  const [phase, setPhase] = useState<Phase>("intro");
  const [guidance, setGuidance] = useState("Ubica tu rostro dentro del óvalo");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(3);
  const [error, setError] = useState("");

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Al desmontar se liberan cámara y temporizador (solo refs, sin estado).
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  /** Fotograma tal como lo ve la cámara (sin espejo), reducido y en JPEG. */
  const grabFrame = () => {
    const video = videoRef.current!;
    const scale = Math.min(1, FRAME_MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  /** Luminosidad media (0–255) de una miniatura del cuadro. */
  const brightness = () => {
    const video = videoRef.current!;
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 255;
    ctx.drawImage(video, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    return sum / (data.length / 4);
  };

  const finish = async () => {
    stop();
    setPhase("sending");
    const { session, frames } = run.current;
    try {
      await onComplete({ livenessSessionId: session!.sessionId, frames });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos verificar tu identidad.");
      setPhase("error");
    }
  };

  const fail = (message: string) => {
    stop();
    setError(message);
    setPhase("error");
  };

  const tick = async (api: FaceApi) => {
    const video = videoRef.current;
    if (busyRef.current || !video || video.readyState < 2) return;
    busyRef.current = true;
    try {
      const state = run.current;
      const faces = await api
        .detectAllFaces(video, new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks();
      if (faces.length === 0) {
        state.stable = 0;
        setGuidance("No te vemos. Ubica tu rostro dentro del óvalo");
        return;
      }
      if (faces.length > 1) {
        state.stable = 0;
        setGuidance("Solo debe aparecer una persona frente a la cámara");
        return;
      }
      const [face] = faces;
      const box = face.detection.box;
      const size = box.width / video.videoWidth;
      const offsetX = Math.abs(box.x + box.width / 2 - video.videoWidth / 2) / video.videoWidth;
      const offsetY = Math.abs(box.y + box.height / 2 - video.videoHeight / 2) / video.videoHeight;
      const points = face.landmarks.positions;

      if (size < 0.22) return reject("Acércate un poco a la cámara");
      if (size > 0.7) return reject("Aléjate un poco de la cámara");
      if (offsetX > 0.18 || offsetY > 0.2) return reject("Centra tu rostro en el óvalo");

      if (!state.neutral) {
        if (brightness() < 55) return reject("Busca un lugar con más luz");
        if (!isFrontal(points)) return reject("Mira de frente a la cámara");
        state.stable += 1;
        setGuidance("¡Perfecto! No te muevas...");
        if (state.stable >= STABLE_TICKS) {
          state.frames = [grabFrame()];
          state.neutral = points;
          state.index = 0;
          state.hits = 0;
          state.challengeStartedAt = Date.now();
          setDone(1);
          setChallenge(state.session!.challenges[0]);
          setPhase("challenge");
        }
        return;
      }

      const current = state.session!.challenges[state.index];
      if (Date.now() - state.challengeStartedAt > CHALLENGE_TIMEOUT_MS) {
        return fail("No detectamos el gesto a tiempo. Intentemos de nuevo con calma.");
      }
      if (challengeMet(current, points, state.neutral)) {
        state.hits += 1;
        if (state.hits >= GESTURE_TICKS) {
          state.frames.push(grabFrame());
          state.index += 1;
          state.hits = 0;
          state.challengeStartedAt = Date.now();
          setDone(1 + state.index);
          if (state.index >= state.session!.challenges.length) {
            await finish();
          } else {
            setChallenge(state.session!.challenges[state.index]);
          }
        }
      } else {
        state.hits = 0;
      }
    } finally {
      busyRef.current = false;
    }

    function reject(message: string) {
      run.current.stable = 0;
      setGuidance(message);
    }
  };

  const begin = async () => {
    stop();
    setError("");
    setPhase("starting");
    setChallenge(null);
    setDone(0);
    setGuidance("Ubica tu rostro dentro del óvalo");
    try {
      const [api, session, stream] = await Promise.all([
        loadFaceApi(),
        fetch(`${API_URL}/biometrics/liveness-sessions`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purpose }),
        }).then(async (res) => {
          if (!res.ok) throw new Error(await readApiError(res, "No pudimos iniciar la verificación"));
          return (await res.json()) as LivenessSession;
        }),
        navigator.mediaDevices
          .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } })
          .catch(() => {
            throw new Error("No pudimos acceder a la cámara. Revisa los permisos del navegador.");
          }),
      ]);
      run.current = {
        session,
        frames: [],
        neutral: null,
        stable: 0,
        hits: 0,
        index: 0,
        challengeStartedAt: 0,
      };
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setTotal(1 + session.challenges.length);
      setPhase("positioning");
      timerRef.current = setInterval(() => void tick(api), TICK_MS);
    } catch (err) {
      fail(err instanceof Error ? err.message : "No pudimos iniciar la verificación");
    }
  };

  if (phase === "intro") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#14183e]/5 text-[#df6951] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#14183e]">{title}</p>
                <p className="text-xs text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={begin}
          className="w-full py-3.5 rounded-full bg-[#df6951] hover:bg-[#c85640] text-white font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          <ScanFace className="w-5 h-5" /> Comenzar verificación facial
        </button>
        <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Tus imágenes se usan solo para verificar tu identidad.
        </p>
      </div>
    );
  }

  const ChallengeIcon = challenge ? CHALLENGE_ICON[challenge] : null;
  const circumference = 2 * Math.PI * 150;
  const live = phase === "positioning" || phase === "challenge";

  return (
    <div className="space-y-4">
      {/* Instrucción principal */}
      <div className="min-h-[64px] text-center">
        {phase === "challenge" && challenge && ChallengeIcon ? (
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#14183e] text-white">
            <ChallengeIcon
              className={`w-7 h-7 text-[#f1a501] ${
                challenge === "TURN_LEFT" ? "animate-[nudge-left_1s_ease-in-out_infinite]" : challenge === "TURN_RIGHT" ? "animate-[nudge-right_1s_ease-in-out_infinite]" : "animate-pulse"
              }`}
            />
            <div className="text-left">
              <p className="font-black text-lg leading-tight">{CHALLENGE_COPY[challenge].title}</p>
              <p className="text-xs text-white/70">{CHALLENGE_COPY[challenge].hint}</p>
            </div>
          </div>
        ) : (
          <p className="font-black text-lg text-[#14183e] pt-3">
            {phase === "sending" ? "Verificando que eres tú..." : phase === "error" ? "Verificación interrumpida" : "Mira de frente a la cámara"}
          </p>
        )}
      </div>

      <div className="relative aspect-[3/4] sm:aspect-[4/3] w-full bg-[#14183e] rounded-[28px] overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />

        {/* Máscara con óvalo y anillo de progreso */}
        <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="oval-hole">
              <rect width="400" height="400" fill="white" />
              <ellipse cx="200" cy="195" rx="112" ry="145" fill="black" />
            </mask>
          </defs>
          <rect width="400" height="400" fill="rgba(20,24,62,0.62)" mask="url(#oval-hole)" />
          <ellipse cx="200" cy="195" rx="118" ry="151" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
          <ellipse
            cx="200"
            cy="195"
            rx="118"
            ry="151"
            fill="none"
            stroke={phase === "error" ? "#df6951" : "#10b981"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - done / total)}
            transform="rotate(-90 200 195)"
            style={{ transition: "stroke-dashoffset 400ms ease" }}
          />
        </svg>

        {live && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center px-4">
            <span className="px-4 py-2 rounded-full bg-white/95 text-[#14183e] text-sm font-semibold shadow-lg text-center">
              {phase === "challenge" ? `Paso ${done + 1} de ${total}` : guidance}
            </span>
          </div>
        )}

        {phase === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <div className="w-10 h-10 border-4 border-[#f1a501] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Preparando la cámara...</p>
          </div>
        )}

        {phase === "sending" && (
          <div className="absolute inset-0 bg-[#14183e]/85 flex flex-col items-center justify-center text-white gap-3">
            <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Comparando tu rostro de forma segura...</p>
            <p className="text-xs text-white/60">Esto toma unos segundos</p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 bg-[#14183e]/90 flex flex-col items-center justify-center text-white gap-3 p-8 text-center">
            <VideoOff className="w-10 h-10 text-[#df6951]" />
            <p className="text-sm max-w-xs">{error}</p>
            <button
              type="button"
              onClick={begin}
              className="mt-2 px-6 py-2.5 rounded-full bg-white text-[#14183e] font-bold text-sm inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Intentar de nuevo
            </button>
          </div>
        )}
      </div>

      {/* Pasos: frente + gestos */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i < done ? "w-8 bg-emerald-500" : "w-4 bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}
