"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
export type LivenessPhase = "intro" | "starting" | "positioning" | "challenge" | "sending" | "error";
type Phase = LivenessPhase;
/** Pasos de la captura: de frente, un gesto por reto y de nuevo de frente para cerrar. */
type Step = "FRONT" | Challenge | "CLOSING";

interface LivenessCaptureProps {
  purpose: LivenessPurpose;
  /** Recibe la captura para enviarla a la API; si lanza, se muestra el error y se ofrece reintentar. */
  onComplete: (capture: LiveCapture) => Promise<void>;
  /** Avisa cada cambio de fase (el celular lo reporta a la computadora). */
  onPhaseChange?: (phase: LivenessPhase) => void;
}

const TICK_MS = 150;
/** Cuánto hay que sostener cada paso antes de tomar el fotograma. */
const HOLD_TICKS: Record<Step, number> = {
  FRONT: 8, // ~1.2 s quieto y de frente
  TURN_LEFT: 4, // ~0.6 s sosteniendo el gesto
  TURN_RIGHT: 4,
  SMILE: 4,
  CLOSING: 6,
};
/** Pausa de confirmación entre pasos: da tiempo a leer la siguiente instrucción. */
const STEP_PAUSE_MS = 900;
const STEP_TIMEOUT_MS = 20_000;
const FRAME_MAX_WIDTH = 720;
/** Una cara menor a esta fracción del rostro principal (en área) no cuenta como otra persona. */
const EXTRA_FACE_AREA_RATIO = 0.25;

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

/** Lo que muestra la pantalla mientras el servidor decide (en el orden en que lo hace). */
const ANALYSIS_STAGES = [
  "Revisando la prueba de vida",
  "Comparando tu rostro con tu cédula",
  "Confirmando tu identidad",
];

/** Óvalo guía en píxeles del contenedor: centrado, con proporción de rostro. */
function ovalFor(width: number, height: number) {
  let ry = height * 0.36;
  let rx = ry * 0.78;
  if (rx > width * 0.4) {
    rx = width * 0.4;
    ry = rx / 0.78;
  }
  return { cx: width / 2, cy: height * 0.47, rx, ry };
}

/** Elipse aproximada (Ramanujan) para el anillo de progreso. */
const ellipsePerimeter = (rx: number, ry: number) =>
  Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));

/**
 * Prueba de vida guiada, como en la app de un banco: consejos, encuadre dentro
 * del óvalo con retroalimentación en vivo, dos gestos al azar pedidos por el
 * servidor, una toma final de frente y el envío de los fotogramas. La cámara
 * siempre es en vivo; no se aceptan archivos.
 */
export default function LivenessCapture({ purpose, onComplete, onPhaseChange }: LivenessCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const sizeRef = useRef({ width: 400, height: 300 });
  const run = useRef({
    session: null as LivenessSession | null,
    steps: [] as Step[],
    frames: [] as string[],
    neutral: null as Point[] | null,
    held: 0,
    index: 0,
    stepStartedAt: 0,
    pausedUntil: 0,
  });

  const [phase, setPhase] = useState<Phase>("intro");
  const [guidance, setGuidance] = useState("Ubica tu rostro dentro del óvalo");
  const [step, setStep] = useState<Step>("FRONT");
  const [aligned, setAligned] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepCount, setStepCount] = useState(4);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [error, setError] = useState("");

  const showingIntro = phase === "intro";

  const go = (next: Phase) => {
    setPhase(next);
    onPhaseChange?.(next);
  };

  const stopAnalysis = () => {
    if (analysisRef.current) clearInterval(analysisRef.current);
    analysisRef.current = null;
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Al desmontar se liberan cámara y temporizadores (solo refs, sin estado).
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (analysisRef.current) clearInterval(analysisRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  // El óvalo se dibuja y se evalúa en píxeles reales del recuadro de la cámara.
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      sizeRef.current = next;
      setSize(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [showingIntro]);

  /** Fotograma tal como lo ve la cámara (sin espejo), reducido y en JPEG. */
  const grabFrame = () => {
    const video = videoRef.current!;
    const scale = Math.min(1, FRAME_MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
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

  /**
   * Caja del rostro en píxeles del recuadro visible: el video se muestra con
   * object-cover y en espejo, así que hay que aplicar el mismo recorte y giro.
   */
  const toStage = (box: { x: number; y: number; width: number; height: number }) => {
    const video = videoRef.current!;
    const { width, height } = sizeRef.current;
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const offsetX = (width - video.videoWidth * scale) / 2;
    const offsetY = (height - video.videoHeight * scale) / 2;
    return {
      cx: width - ((box.x + box.width / 2) * scale + offsetX),
      cy: (box.y + box.height / 2) * scale + offsetY,
      width: box.width * scale,
    };
  };

  const updateProgress = (held = run.current.held) => {
    const state = run.current;
    const current = state.steps[state.index];
    const fraction = current ? Math.min(1, held / HOLD_TICKS[current]) : 0;
    setProgress((state.index + fraction) / state.steps.length);
  };

  const finish = async () => {
    stop();
    go("sending");
    setAnalysisStage(0);
    analysisRef.current = setInterval(
      () => setAnalysisStage((stage) => Math.min(stage + 1, ANALYSIS_STAGES.length - 1)),
      1600,
    );
    const { session, frames } = run.current;
    try {
      await onComplete({ livenessSessionId: session!.sessionId, frames });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos verificar tu identidad.");
      go("error");
    } finally {
      stopAnalysis();
    }
  };

  const fail = (message: string) => {
    stop();
    setError(message);
    go("error");
  };

  /** Paso cumplido: guarda el fotograma, celebra un instante y pasa al siguiente. */
  const advance = async () => {
    const state = run.current;
    state.frames.push(grabFrame());
    state.index += 1;
    state.held = 0;
    updateProgress(0);
    if (state.index >= state.steps.length) {
      await finish();
      return;
    }
    state.pausedUntil = Date.now() + STEP_PAUSE_MS;
    state.stepStartedAt = state.pausedUntil;
    setCelebrating(true);
    setTimeout(() => {
      setCelebrating(false);
      setStep(state.steps[state.index]);
      if (state.index > 0) go("challenge");
    }, STEP_PAUSE_MS);
  };

  const tick = async (api: FaceApi) => {
    const video = videoRef.current;
    const state = run.current;
    if (busyRef.current || !video || video.readyState < 2 || Date.now() < state.pausedUntil) return;
    busyRef.current = true;
    try {
      const current = state.steps[state.index];
      if (state.index > 0 && Date.now() - state.stepStartedAt > STEP_TIMEOUT_MS) {
        return fail("No detectamos el gesto a tiempo. Intentemos de nuevo con calma.");
      }

      const detections = await api
        .detectAllFaces(video, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks();
      // El más grande es la persona; caras pequeñas al fondo o falsos positivos no cuentan.
      const faces = detections
        .sort((a, b) => b.detection.box.area - a.detection.box.area)
        .filter((face, i, all) => i === 0 || face.detection.box.area >= all[0].detection.box.area * EXTRA_FACE_AREA_RATIO);
      if (faces.length === 0) return hold(false, "No te vemos. Ubica tu rostro dentro del óvalo");
      if (faces.length > 1) return hold(false, "Solo debe aparecer una persona frente a la cámara");

      const [face] = faces;
      const points = face.landmarks.positions;
      const oval = ovalFor(sizeRef.current.width, sizeRef.current.height);
      const onStage = toStage(face.detection.box);
      const widthRatio = onStage.width / (2 * oval.rx);
      const offset = Math.hypot((onStage.cx - oval.cx) / oval.rx, (onStage.cy - oval.cy) / oval.ry);
      const frontalStep = current === "FRONT" || current === "CLOSING";

      if (widthRatio < 0.5) return hold(false, "Acércate un poco a la cámara");
      if (widthRatio > 1.15) return hold(false, "Aléjate un poco de la cámara");
      // Al girar la cabeza la caja se desplaza: en los gestos se tolera más.
      if (offset > (frontalStep ? 0.3 : 0.55)) return hold(false, "Centra tu rostro dentro del óvalo");

      if (frontalStep) {
        if (brightness() < 55) return hold(false, "Busca un lugar con más luz");
        if (!isFrontal(points)) return hold(false, "Mira de frente a la cámara");
        return hold(true, "¡Perfecto! No te muevas...", current === "FRONT" ? points : undefined);
      }
      if (challengeMet(current, points, state.neutral!)) return hold(true, "¡Eso es! Mantén el gesto...");
      return hold(false, CHALLENGE_COPY[current].hint, undefined, true);
    } finally {
      busyRef.current = false;
    }

    /** Suma o reinicia el tiempo sostenido del paso y avanza al completarlo. */
    async function hold(ok: boolean, message: string, neutral?: Point[], inFrame = false) {
      const state = run.current;
      setAligned(ok || inFrame);
      setGuidance(message);
      if (!ok) {
        state.held = 0;
        updateProgress(0);
        return;
      }
      if (neutral) state.neutral = neutral;
      state.held += 1;
      updateProgress();
      if (state.held >= HOLD_TICKS[state.steps[state.index]]) await advance();
    }
  };

  const begin = async () => {
    stop();
    stopAnalysis();
    setError("");
    go("starting");
    setStep("FRONT");
    setProgress(0);
    setAligned(false);
    setCelebrating(false);
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
      const steps: Step[] = ["FRONT", ...session.challenges, "CLOSING"];
      run.current = {
        session,
        steps,
        frames: [],
        neutral: null,
        held: 0,
        index: 0,
        stepStartedAt: Date.now(),
        pausedUntil: 0,
      };
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStepCount(steps.length);
      go("positioning");
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
              <div className="w-10 h-10 rounded-xl bg-brand-primary/5 text-brand-secondary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-primary">{title}</p>
                <p className="text-xs text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={begin}
          className="w-full py-3.5 rounded-full bg-brand-secondary hover:bg-brand-secondary-dark active:scale-[0.98] transition-transform text-white font-bold text-sm shadow-lg shadow-brand-secondary/20 flex items-center justify-center gap-2"
        >
          <ScanFace className="w-5 h-5" /> Comenzar verificación facial
        </button>
        <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Tus imágenes se usan solo para verificar tu identidad.
        </p>
      </div>
    );
  }

  const live = phase === "positioning" || phase === "challenge";
  const oval = ovalFor(size.width, size.height);
  const perimeter = ellipsePerimeter(oval.rx + 6, oval.ry + 6);
  const isGesture = step !== "FRONT" && step !== "CLOSING";
  const ChallengeIcon = isGesture ? CHALLENGE_ICON[step] : null;
  const ringColor = phase === "error" ? "#df6951" : aligned || celebrating ? "#10b981" : "rgba(255,255,255,0.9)";
  const title =
    phase === "sending"
      ? "Verificando que eres tú..."
      : phase === "error"
        ? "Verificación interrumpida"
        : step === "CLOSING"
          ? "Vuelve a mirar al frente"
          : "Mira de frente a la cámara";

  return (
    <div className="space-y-4">
      {/* Instrucción principal */}
      <div className="min-h-[64px] flex items-center justify-center text-center">
        {celebrating ? (
          <p className="inline-flex items-center gap-2 font-black text-lg text-emerald-600 animate-in fade-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-6 h-6" /> ¡Bien!
          </p>
        ) : live && isGesture && ChallengeIcon ? (
          <div key={step} className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-brand-primary text-white animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ChallengeIcon
              className={`w-7 h-7 text-brand-accent ${
                step === "TURN_LEFT" ? "animate-[nudge-left_1s_ease-in-out_infinite]" : step === "TURN_RIGHT" ? "animate-[nudge-right_1s_ease-in-out_infinite]" : "animate-pulse"
              }`}
            />
            <div className="text-left">
              <p className="font-black text-lg leading-tight">{CHALLENGE_COPY[step].title}</p>
              <p className="text-xs text-white/70">{CHALLENGE_COPY[step].hint}</p>
            </div>
          </div>
        ) : (
          <p key={title} className="font-black text-lg text-brand-primary animate-in fade-in duration-300">{title}</p>
        )}
      </div>

      <div ref={stageRef} className="relative aspect-[3/4] sm:aspect-[4/3] w-full bg-brand-primary rounded-[28px] overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />

        {/* Máscara con el óvalo y anillo de progreso, en píxeles reales del recuadro */}
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <mask id="oval-hole">
              <rect width={size.width} height={size.height} fill="white" />
              <ellipse cx={oval.cx} cy={oval.cy} rx={oval.rx} ry={oval.ry} fill="black" />
            </mask>
          </defs>
          <rect width={size.width} height={size.height} fill="rgba(20,24,62,0.62)" mask="url(#oval-hole)" />
          <ellipse
            cx={oval.cx}
            cy={oval.cy}
            rx={oval.rx + 6}
            ry={oval.ry + 6}
            fill="none"
            stroke={ringColor}
            strokeOpacity={0.35}
            strokeWidth="5"
            style={{ transition: "stroke 250ms ease" }}
          />
          <ellipse
            cx={oval.cx}
            cy={oval.cy}
            rx={oval.rx + 6}
            ry={oval.ry + 6}
            fill="none"
            stroke={phase === "error" ? "#df6951" : "#10b981"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={perimeter}
            strokeDashoffset={perimeter * (1 - progress)}
            transform={`rotate(-90 ${oval.cx} ${oval.cy})`}
            style={{ transition: "stroke-dashoffset 200ms linear" }}
          />
        </svg>

        {live && !celebrating && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center px-4">
            <span
              key={guidance}
              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg text-center animate-in fade-in duration-200 ${
                aligned ? "bg-emerald-500 text-white" : "bg-white/95 text-brand-primary"
              }`}
            >
              {guidance}
            </span>
          </div>
        )}

        {phase === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Preparando la cámara...</p>
          </div>
        )}

        {phase === "sending" && (
          <div className="absolute inset-0 bg-brand-primary/90 flex flex-col items-center justify-center text-white gap-5 p-6 animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <ul className="space-y-2.5 text-sm">
              {ANALYSIS_STAGES.map((label, i) => (
                <li
                  key={label}
                  className={`flex items-center gap-2.5 transition-opacity duration-300 ${
                    i === analysisStage ? "opacity-100 font-semibold" : i < analysisStage ? "opacity-60" : "opacity-30"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${i === analysisStage ? "bg-emerald-400 animate-pulse" : "bg-white/60"}`} />
                  {label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/50">Esto toma unos segundos</p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 bg-brand-primary/90 flex flex-col items-center justify-center text-white gap-3 p-8 text-center animate-in fade-in duration-200">
            <VideoOff className="w-10 h-10 text-brand-secondary" />
            <p className="text-sm max-w-xs">{error}</p>
            <button
              type="button"
              onClick={begin}
              className="mt-2 px-6 py-2.5 rounded-full bg-brand-card-bg text-brand-primary font-bold text-sm inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> Intentar de nuevo
            </button>
          </div>
        )}
      </div>

      {/* Pasos: frente, gestos y cierre */}
      <div className="flex justify-center gap-2" aria-label={`Paso ${Math.min(Math.floor(progress * stepCount) + 1, stepCount)} de ${stepCount}`}>
        {Array.from({ length: stepCount }, (_, i) => {
          const fill = Math.min(1, Math.max(0, progress * stepCount - i));
          return (
            <span key={i} className="relative h-1.5 w-8 rounded-full bg-slate-200 overflow-hidden">
              <span className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-[width] duration-200" style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
