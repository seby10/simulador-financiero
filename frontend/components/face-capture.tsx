"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, VideoOff } from "lucide-react";

interface FaceCaptureProps {
  /** Recibe la captura como data URL JPEG. */
  onCapture: (dataUrl: string) => void;
  /** Deshabilita los controles mientras se envía la captura. */
  busy?: boolean;
  /** Texto del botón principal cuando ya hay una captura. */
  submitLabel?: string;
  onSubmit?: () => void;
  captured?: string | null;
  onRetake?: () => void;
}

/**
 * Cámara en vivo con óvalo guía. A propósito no ofrece "cargar foto": la
 * verificación de identidad solo acepta capturas tomadas en el momento.
 */
export default function FaceCapture({
  onCapture,
  busy = false,
  submitLabel = "Confirmar",
  onSubmit,
  captured,
  onRetake,
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch {
      setError(
        "No pudimos acceder a la cámara. Revisa los permisos del navegador o continúa desde tu celular.",
      );
    }
  };

  // Al salir se libera la cámara (solo toca el stream, no el estado).
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
    stop();
  };

  const retake = () => {
    onRetake?.();
    void start();
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full bg-[#14183e] rounded-[24px] overflow-hidden flex items-center justify-center">
        {captured ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL local, no pasa por next/image
          <img src={captured} alt="Tu captura" className="w-full h-full object-cover -scale-x-100" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${active ? "block" : "hidden"}`}
            />
            {active && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-44 h-56 rounded-[50%] border-2 border-[#f1a501] shadow-[0_0_0_9999px_rgba(20,24,62,0.45)]" />
                <span className="mt-3 px-3 py-1 rounded-full bg-[#14183e]/80 text-white text-xs font-medium">
                  Centra tu rostro en el óvalo
                </span>
              </div>
            )}
            {!active && (
              <div className="text-center text-white/80 p-6 space-y-2">
                {error ? <VideoOff className="w-10 h-10 mx-auto text-[#df6951]" /> : <Camera className="w-10 h-10 mx-auto" />}
                <p className="text-sm max-w-xs">{error ?? "Activa la cámara para tomar tu foto en vivo."}</p>
              </div>
            )}
          </>
        )}
        {busy && (
          <div className="absolute inset-0 bg-[#14183e]/80 flex flex-col items-center justify-center text-white">
            <div className="w-9 h-9 border-4 border-[#f1a501] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Comparando tu rostro...</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {captured ? (
          <>
            <button
              type="button"
              onClick={retake}
              disabled={busy}
              className="px-5 py-3 rounded-full border border-slate-300 text-slate-700 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" /> Repetir
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="flex-1 py-3 rounded-full bg-[#df6951] hover:bg-[#c85640] text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={active ? capture : start}
            className="flex-1 py-3 rounded-full bg-[#14183e] hover:bg-[#1f2560] text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {active ? "Tomar foto" : error ? "Reintentar cámara" : "Activar cámara"}
          </button>
        )}
      </div>
    </div>
  );
}
