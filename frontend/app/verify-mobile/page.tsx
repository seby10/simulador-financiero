"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  User,
  Check,
  ArrowRight,
  ScanFace,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
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

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
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

    const analysis = await analyzeImageQuality(capturedImage);
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
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-800 relative">
      <Navbar />

      {/* Hidden Native File Capture Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />

      <main className="flex-1 flex items-start justify-center p-4 pt-1 sm:pt-4 pb-10 relative z-10">
        <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl shadow-amber-900/10 overflow-hidden border border-amber-200/50 my-0 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Card Header Banner */}
            <div className="bg-gradient-to-b from-[#f7e6c5] to-[#f4dfb7] p-8 sm:p-9 text-center flex flex-col items-center justify-center relative overflow-hidden border-b border-[#e2c999]">
              <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center mb-3 border border-amber-200 shadow-md shadow-amber-900/5 backdrop-blur-md">
                <ScanFace className="w-8 h-8 text-[#df6951]" />
              </div>
              <h1 className="text-2xl sm:text-[28px] font-bold font-serif-title tracking-tight text-[#181e2b] mb-1.5">
                Validación de Rostro
              </h1>
              <p className="text-[#5e6282] text-xs sm:text-sm max-w-xs font-normal leading-relaxed">
                Captura tu fotografía clara de frente para validar tu identidad digital.
              </p>

              {/* Security Pill Badge */}
              <div className="flex bg-white/70 p-2 rounded-full mt-5 border border-amber-200/80 backdrop-blur-md shadow-sm items-center gap-2 px-4 text-xs font-bold text-[#df6951]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Canal Biométrico Seguro</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-7 sm:p-10 space-y-6">
              
              {/* Camera / Capture Frame */}
              <div className="relative aspect-[3/4] w-full bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner flex items-center justify-center">
                {capturedImage ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img
                      src={capturedImage}
                      alt="Foto tomada"
                      className="w-full h-full object-cover"
                    />

                    {isVerifying && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                        <div className="w-10 h-10 border-3 border-[#f1a501] border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs font-semibold">Validando fotografía...</p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Verificando parámetros biométricos en vivo.
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
                      <div className="w-44 h-60 rounded-[50%] border-2 border-dashed border-[#f1a501] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] animate-pulse flex items-center justify-center" />
                      <span className="mt-3 px-3.5 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-medium backdrop-blur-sm border border-slate-700">
                        Centra tu rostro en el óvalo
                      </span>
                    </div>

                    {/* Toggle camera button */}
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-800 backdrop-blur-sm border border-slate-700 transition-colors"
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
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div
                    className={`p-4 rounded-2xl border ${
                      result.passed
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-red-50 border-red-200 text-red-950"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.passed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm">
                          {result.passed
                            ? "Verificación de Identidad Aprobada"
                            : "Verificación No Completada"}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {result.passed
                            ? "Tu rostro ha sido validado exitosamente. Ya puedes continuar con tu solicitud."
                            : result.failureReason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {result.passed ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-2 shadow-sm">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-1">
                        <Check className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        ¡Proceso Biométrico Finalizado!
                      </p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Puedes cerrar esta pestaña y regresar a la pantalla principal.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={resetCapture}
                      className="w-full py-4 rounded-full bg-[#df6951] hover:bg-[#c85640] text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Intentar Nuevamente
                    </button>
                  )}
                </div>
              ) : errorMessage ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {/* Single Main Action Button */}
              {!result && (
                <div className="pt-1">
                  {capturedImage ? (
                    <div className="flex gap-3">
                      <button
                        onClick={resetCapture}
                        disabled={isVerifying}
                        className="px-5 py-3.5 rounded-full font-bold border border-slate-200 text-[#5e6282] hover:bg-slate-100 text-xs flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Repetir
                      </button>
                      <button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="flex-1 py-4 rounded-full bg-[#df6951] hover:bg-[#c85640] text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] transition-all"
                      >
                        <ShieldCheck className="w-5 h-5 text-[#f1a501]" />
                        {isVerifying ? "Validando..." : "Confirmar y Validar"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCaptureClick}
                      className="w-full bg-[#df6951] hover:bg-[#c85640] text-white py-4 rounded-full font-bold text-sm sm:text-base shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      Tomar Fotografía
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
