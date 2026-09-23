"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Building2,
  User,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  analyzeImageQuality,
  runSimulatedVerification,
  BiometricResult,
} from "@/lib/face-analysis";

export default function VerifyMobilePage() {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<BiometricResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load face-api models silently on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import("face-api.js");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      } catch (err) {
        console.error("Error loading face models:", err);
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setCapturedImage(null);
    setResult(null);

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facingMode,
        },
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Try starting WebRTC camera feed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleCaptureClick = () => {
    if (cameraActive && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
        return;
      }
    }

    // Open native mobile camera / gallery input
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor selecciona un archivo de imagen válido (JPG o PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setResult(null);
    setErrorMessage(null);
    startCamera();
  };

  const handleVerify = async () => {
    if (!capturedImage) return;

    setIsVerifying(true);
    setErrorMessage(null);
    setResult(null);

    // Run facial analysis
    const analysis = await analyzeImageQuality(capturedImage);

    // Simulate backend response
    const res = runSimulatedVerification(analysis);
    setResult(res);
    setIsVerifying(false);

    if (!res.passed) {
      setErrorMessage(
        res.failureReason ||
          "No fue posible confirmar tu rostro. Por favor mantén la cabeza recta y sin objetos en la cara."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Hidden Native File Capture Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Corporate Bank Top Bar */}
      <header className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight">
              BANCO<span className="text-blue-400">FINANCIERO</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-medium">
              Verificación de Identidad Digital
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Canal Seguro</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-sm w-full mx-auto p-4 flex flex-col justify-between space-y-4">
        {/* Title Banner */}
        <div className="text-center pt-2 pb-1">
          <h1 className="text-base font-bold text-slate-900">
            Validación de Rostro
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saca una fotografía clara de tu rostro de frente para validar tu solicitud.
          </p>
        </div>

        {/* Camera / Capture Frame */}
        <div className="relative aspect-[3/4] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-md flex items-center justify-center">
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Foto tomada"
                className="w-full h-full object-cover"
              />

              {isVerifying && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold">Validando fotografía...</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Verificando parámetros de seguridad con el sistema bancario.
                  </p>
                </div>
              )}
            </div>
          ) : cameraActive ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "transform -scale-x-100" : ""
                }`}
              />

              {/* Oval Framing Guide */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-48 h-64 rounded-[50%] border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] flex items-center justify-center" />
                <span className="mt-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-medium backdrop-blur-sm">
                  Centra tu rostro en el óvalo
                </span>
              </div>

              {/* Toggle camera button */}
              <button
                onClick={toggleCamera}
                className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-800 backdrop-blur-sm border border-slate-700"
                title="Girar cámara"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-slate-400">
                <User className="w-10 h-10" />
              </div>
              <p className="text-xs font-medium text-slate-200">
                Cámara lista para captura
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Presiona el botón a continuación para tomar tu foto.
              </p>
            </div>
          )}
        </div>

        {/* Verification Results Card */}
        {result ? (
          <div className="space-y-3">
            <div
              className={`p-4 rounded-xl border ${
                result.passed
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-rose-50 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.passed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-xs">
                    {result.passed
                      ? "Verificación de Identidad Aprobada"
                      : "Verificación No Completada"}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {result.passed
                      ? "Tu rostro ha sido validado exitosamente. Ya puedes continuar con tu solicitud."
                      : result.failureReason}
                  </p>
                </div>
              </div>
            </div>

            {result.passed ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-2 shadow-sm">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  ¡Proceso Biométrico Finalizado!
                </p>
                <p className="text-[11px] text-slate-500">
                  Puedes cerrar esta pestaña y regresar a la pantalla de tu computador.
                </p>
              </div>
            ) : (
              <button
                onClick={resetCapture}
                className="w-full py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Intentar Nuevamente
              </button>
            )}
          </div>
        ) : errorMessage ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Single Main Action Button */}
        {!result && (
          <div className="pt-1">
            {capturedImage ? (
              <div className="flex gap-2">
                <button
                  onClick={resetCapture}
                  disabled={isVerifying}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Repetir
                </button>
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isVerifying ? "Validando..." : "Confirmar y Validar"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleCaptureClick}
                className="w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-4.5 h-4.5" />
                Tomar Fotografía
              </button>
            )}
          </div>
        )}
      </main>

      {/* Corporate Mobile Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-500">
        © 2026 Banco Financiero S.A. • Seguridad de Identidad
      </footer>
    </div>
  );
}
