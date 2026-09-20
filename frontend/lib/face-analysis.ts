export interface FaceAnalysisResult {
  hasCenteredFace: boolean;
  skinRatio: number;
  reason: string | null;
}

export interface BiometricResult {
  applicationId: string;
  attempt: number;
  passed: boolean;
  livenessScore: string;
  matchScore: string;
  status: "APPROVED" | "MANUAL_REVIEW" | "REJECTED" | "PENDING_BIOMETRICS";
  remainingAttempts: number;
  checks: {
    liveness: "PASSED" | "FAILED" | string;
    faceMatch: "MATCH" | "NO_MATCH" | string;
  };
  failureReason: string | null;
}

export async function analyzeImageQuality(
  base64Image: string
): Promise<FaceAnalysisResult> {
  try {
    const faceapi = await import("face-api.js");

    // Load models if not already loaded
    if (!faceapi.nets.tinyFaceDetector.params) {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    }
    if (!faceapi.nets.faceLandmark68Net.params) {
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    }

    // Create an img element from base64
    const img = document.createElement("img");
    img.crossOrigin = "Anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
      img.src = base64Image;
    });

    // Run face detection with landmarks using TinyFaceDetector
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
    const detections = await faceapi.detectAllFaces(img, options).withFaceLandmarks();

    console.log("face-api.js detections:", detections.length, detections);

    // NO FACE DETECTED
    if (detections.length === 0) {
      return {
        hasCenteredFace: false,
        skinRatio: 0,
        reason: "No se detectó un rostro. Asegúrate de que tu cara esté visible, descubierta y mirando a la cámara.",
      };
    }

    // Get the largest detected face
    const detection = detections.reduce((a, b) =>
      a.detection.box.area > b.detection.box.area ? a : b
    );
    const box = detection.detection.box;
    const landmarks = detection.landmarks;
    const imgW = img.width;
    const imgH = img.height;

    const faceAreaRatio = box.area / (imgW * imgH);
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const centerOffsetX = Math.abs(faceCenterX - imgW / 2) / imgW;
    const centerOffsetY = Math.abs(faceCenterY - imgH / 2) / imgH;

    // Check confidence score
    if (detection.detection.score < 0.55) {
      return {
        hasCenteredFace: false,
        skinRatio: faceAreaRatio,
        reason: "El rostro no se detecta con claridad. Retira objetos que cubran tu cara y mira directamente a la cámara.",
      };
    }

    // FACE TOO SMALL
    if (faceAreaRatio < 0.03) {
      return {
        hasCenteredFace: false,
        skinRatio: faceAreaRatio,
        reason: "Tu rostro se ve muy pequeño. Acércate más a la cámara.",
      };
    }

    // FACE NOT CENTERED
    if (centerOffsetX > 0.30 || centerOffsetY > 0.30) {
      return {
        hasCenteredFace: false,
        skinRatio: faceAreaRatio,
        reason: "Tu rostro no está centrado. Muévete al centro del encuadre.",
      };
    }

    // FACE AT BOTTOM EDGE
    if (box.y + box.height > imgH * 0.93 && box.y > imgH * 0.40) {
      return {
        hasCenteredFace: false,
        skinRatio: faceAreaRatio,
        reason: "Tu rostro está cortado en el borde inferior. Levanta la cámara o centra la cabeza.",
      };
    }

    // LANDMARK VALIDATION
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();

    const eyeSpread = Math.abs(
      (leftEye[0].x + leftEye[3].x) / 2 - (rightEye[0].x + rightEye[3].x) / 2
    );
    const expectedEyeSpread = box.width * 0.25;

    if (eyeSpread < expectedEyeSpread) {
      return {
        hasCenteredFace: false,
        skinRatio: faceAreaRatio,
        reason: "Los ojos no se detectan correctamente. Retira objetos que cubran tu rostro.",
      };
    }

    // Vertical landmark order (eyes above nose above mouth)
    const avgEyeY = (leftEye[0].y + rightEye[0].y) / 2;
    const avgNoseY = nose[nose.length - 1].y;
    const avgMouthY = (mouth[0].y + mouth[6].y) / 2;

    if (!(avgEyeY < avgNoseY && avgNoseY < avgMouthY)) {
      return {
        hasCenteredFace: false,
        skinRatio: faceAreaRatio,
        reason: "Las facciones no se detectan en posición correcta. Mira de frente a la cámara sin obstrucciones.",
      };
    }

    return { hasCenteredFace: true, skinRatio: faceAreaRatio, reason: null };
  } catch (err) {
    console.error("Error in analyzeImageQuality:", err);
    return {
      hasCenteredFace: false,
      skinRatio: 0,
      reason: "Error al procesar la imagen facial. Reintenta la captura.",
    };
  }
}

export function runSimulatedVerification(
  analysis: FaceAnalysisResult,
  applicationId: string = "c8a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
  attemptCount: number = 1
): BiometricResult {
  if (!analysis.hasCenteredFace) {
    return {
      applicationId,
      attempt: attemptCount,
      passed: false,
      livenessScore: (12.5 + Math.random() * 15).toFixed(1),
      matchScore: (20.0 + Math.random() * 20).toFixed(1),
      status: "REJECTED",
      remainingAttempts: Math.max(0, 3 - attemptCount),
      checks: {
        liveness: "FAILED",
        faceMatch: "NO_MATCH",
      },
      failureReason:
        analysis.reason ||
        "No se detectó un rostro claro y libre de obstrucciones en la toma.",
    };
  }

  const liveness = (94.0 + Math.random() * 5.5).toFixed(1);
  const match = (96.5 + Math.random() * 3.2).toFixed(1);

  return {
    applicationId,
    attempt: attemptCount,
    passed: true,
    livenessScore: liveness,
    matchScore: match,
    status: "APPROVED",
    remainingAttempts: 3 - attemptCount,
    checks: {
      liveness: "PASSED",
      faceMatch: "MATCH",
    },
    failureReason: null,
  };
}
