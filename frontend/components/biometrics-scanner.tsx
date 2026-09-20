"use client";

import React, { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  User,
  ArrowRight,
  HelpCircle,
  FileCheck,
  Check,
  Smartphone,
} from "lucide-react";
import {
  analyzeImageQuality,
  runSimulatedVerification,
  BiometricResult,
} from "@/lib/face-analysis";

export function BiometricsScanner() {
  const [applicationId] = useState<string>(
    "c8a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
  );

  // Camera & Capture State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"camera" | "file">("camera");
  const [showQR, setShowQR] = useState<boolean>(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<BiometricResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        "No fue posible activar la cámara del equipo. Escanea el código QR con tu celular para continuar."
      );
      setCameraActive(false);
      setShowQR(true);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
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
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor sube una imagen en formato JPG o PNG.");
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
    if (inputMode === "camera") {
      startCamera();
    }
  };

  // Load face-api.js models silently on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import("face-api.js");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      } catch (err) {
        console.error("Error loading face-api.js models:", err);
      }
    };
    loadModels();
  }, []);

  const executeVerification = async () => {
    if (!capturedImage) {
      setErrorMessage("Debes capturar o adjuntar una fotografía de tu rostro.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setResult(null);

    // Perform face analysis
    const analysis = await analyzeImageQuality(capturedImage);
    const simRes = runSimulatedVerification(analysis, applicationId, 1);
    setResult(simRes);
    setIsVerifying(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Onboarding Wizard Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">
              1. Solicitud
            </span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">
              2. Datos Personales
            </span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shadow-sm">
              3
            </span>
            <span className="text-xs font-bold text-blue-900">
              3. Verificación de Identidad
            </span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-medium flex items-center justify-center">
              4
            </span>
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              4. Finalización
            </span>
          </div>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold">Verificación de Identidad Digital</h2>
              <p className="text-xs text-slate-300">
                Confirmación de titularidad para trámites de Inversión y Crédito
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions Box */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 space-y-1">
              <p className="font-semibold">Recomendaciones para la captura:</p>
              <ul className="list-disc list-inside text-blue-900 space-y-0.5">
                <li>Ubícate en un espacio bien iluminado sin sombras fuertes.</li>
                <li>Retírate anteojos de sol, mascarillas o prendas que cubran el rostro.</li>
                <li>Mira directamente hacia la cámara de forma recta.</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Camera Viewport Area */}
            <div className="md:col-span-7 space-y-4">
              {/* Tab options */}
              <div className="flex border-b border-slate-200 text-xs font-medium">
                <button
                  onClick={() => {
                    setInputMode("camera");
                    if (!capturedImage) startCamera();
                  }}
                  className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all ${
                    inputMode === "camera"
                      ? "border-blue-700 text-blue-800 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Cámara Web
                </button>
                <button
                  onClick={() => {
                    setInputMode("file");
                    stopCamera();
                  }}
                  className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-all ${
                    inputMode === "file"
                      ? "border-blue-700 text-blue-800 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Cargar Fotografía
                </button>
              </div>

              {/* Viewport Display */}
              <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-300 flex items-center justify-center shadow-inner">
                {capturedImage ? (
                  <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <img
                      src={capturedImage}
                      alt="Fotografía tomada"
                      className="w-full h-full object-contain"
                    />
                    {isVerifying && (
                      <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-4 text-white text-center">
                        <div className="w-9 h-9 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs font-semibold">Validando identidad...</p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Verificando fotografía con los registros de la solicitud
                        </p>
                      </div>
                    )}
                  </div>
                ) : inputMode === "camera" ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />

                    {!cameraActive && (
                      <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                        {showQR && cameraError ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 text-slate-800 mb-0.5">
                              <Smartphone className="w-5 h-5 text-blue-700" />
                              <span className="text-xs font-bold">Verificar desde tu celular</span>
                            </div>
                            <p className="text-[11px] text-slate-600 max-w-[240px] mb-1">
                              Escanea este código QR con la cámara de tu celular para completar la validación fácilmente.
                            </p>
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                              <QRCodeSVG
                                value={(() => {
                                  if (typeof window !== "undefined") {
                                    const hostname = window.location.hostname;
                                    const port = window.location.port;
                                    const networkHost = hostname === "localhost" || hostname === "127.0.0.1"
                                      ? `${window.location.protocol}//192.168.1.43:${port}`
                                      : window.location.origin;
                                    return `${networkHost}/verify-mobile`;
                                  }
                                  return "http://192.168.1.43:3000/verify-mobile";
                                })()}
                                size={140}
                                level="M"
                                bgColor="#ffffff"
                                fgColor="#1e293b"
                              />
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => { setShowQR(false); startCamera(); }}
                                className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-[11px] transition-all"
                              >
                                Reintentar Cámara
                              </button>
                              <button
                                onClick={() => { setShowQR(false); setInputMode("file"); stopCamera(); }}
                                className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-medium text-[11px] transition-all"
                              >
                                Cargar Archivo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <User className="w-12 h-12 text-slate-400 mb-2" />
                            <p className="text-xs text-slate-600 max-w-xs">
                              {cameraError || "Presiona el botón a continuación para iniciar tu cámara."}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-48 h-60 rounded-[50%] border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.4)] flex items-center justify-center" />
                        <span className="mt-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-medium backdrop-blur-sm">
                          Centra tu rostro dentro del marco
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 w-full h-full">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      Selecciona una foto clara de tu rostro
                    </p>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Formatos admitidos: JPG, PNG
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm"
                    >
                      Buscar Fotografía
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {capturedImage ? (
                  <>
                    <button
                      onClick={resetCapture}
                      disabled={isVerifying}
                      className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Repetir Foto
                    </button>
                    <button
                      onClick={executeVerification}
                      disabled={isVerifying}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <FileCheck className="w-4 h-4" />
                      {isVerifying ? "Validando..." : "Confirmar y Validar"}
                    </button>
                  </>
                ) : inputMode === "camera" ? (
                  <div className="w-full flex gap-2">
                    <button
                      onClick={() => {
                        if (cameraActive) {
                          capturePhoto();
                        } else {
                          startCamera();
                        }
                      }}
                      className="flex-1 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      {cameraActive ? "Tomar Foto" : "Iniciar Cámara"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Verification Result Details Box */}
            <div className="md:col-span-5 space-y-4">
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
                  Estado del Proceso
                </h3>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {result ? (
                  <div className="space-y-4">
                    {/* Status Banner */}
                    <div
                      className={`p-3.5 rounded-lg border flex items-center gap-3 ${
                        result.passed
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-rose-50 border-rose-200 text-rose-950"
                      }`}
                    >
                      {result.passed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold">
                          {result.passed
                            ? "Identidad Confirmada"
                            : "Verificación No Completada"}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Estado: <strong className="font-semibold">{result.status === "APPROVED" ? "Aprobado" : "Rechazado"}</strong>
                        </p>
                      </div>
                    </div>

                    {result.passed && (
                      <button
                        onClick={() =>
                          alert("¡Validación completada! Avanzando al siguiente paso...")
                        }
                        className="w-full py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                      >
                        Continuar Solicitud
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      Pendiente de fotografía
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Toma una foto clara de tu rostro para validar tu identidad.
                    </p>
                  </div>
                )}
              </div>

              {/* Application Details Summary */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white text-xs space-y-2">
                <p className="font-bold text-slate-800">Resumen de la Solicitud</p>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>N° Solicitud:</span>
                  <span className="font-mono text-[11px] text-slate-700 font-medium">
                    {applicationId.slice(0, 14)}...
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Trámite:</span>
                  <span className="text-slate-700 font-medium">
                    Simulador Financiero / Crédito
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
