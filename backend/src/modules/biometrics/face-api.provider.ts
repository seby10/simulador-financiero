import { BadRequestException, Injectable } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js';
import jpeg from 'jpeg-js';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import { detectFileKind } from '../../common/http.js';
import type {
  BiometricAssessment,
  BiometricCapture,
  BiometricProvider,
} from './biometrics.provider.js';

// face-api.node-wasm usa esta misma instancia de tfjs (no la empaqueta).
const require = createRequire(import.meta.url);

/** Pesos de los modelos: vienen dentro del paquete, no se descargan en tiempo de ejecución. */
const MODEL_DIR = join(
  dirname(require.resolve('@vladmandic/face-api/package.json')),
  'model',
);

/** Lado mayor con el que se analiza una imagen: más grande solo gasta memoria. */
const MAX_SIDE = 1280;
const MIN_DETECTION_CONFIDENCE = 0.5;

/**
 * Distancia euclidiana entre descriptores que vale 75 puntos (el umbral por
 * defecto de BIOMETRIC_MATCH_MIN). Calibrada con las fotos de muestra del
 * paquete: la misma persona quedó entre 0.05 y 0.35 y personas distintas desde
 * 0.47 hacia arriba. Es más estricta que el 0.6 habitual para no aceptar a otra
 * persona; si fotos reales de cédula la superan, subir el umbral por entorno.
 */
const DISTANCE_AT_THRESHOLD = 0.45;

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

/** 0 → 100 puntos, DISTANCE_AT_THRESHOLD → 75, y baja linealmente desde ahí. */
export const distanceToScore = (distance: number) =>
  round2(clamp(100 - (distance / DISTANCE_AT_THRESHOLD) * 25));

type FaceResult = faceapi.WithFaceDescriptor<
  faceapi.WithFaceLandmarks<
    { detection: faceapi.FaceDetection },
    faceapi.FaceLandmarks68
  >
>;

let engine: Promise<void> | undefined;

/** Carga el backend WASM y los tres modelos una sola vez por proceso. */
function loadEngine() {
  engine ??= (async () => {
    setWasmPaths(
      `${dirname(require.resolve('@tensorflow/tfjs-backend-wasm'))}/`,
    );
    await tf.setBackend('wasm');
    await tf.ready();
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR),
    ]);
  })().catch((error: unknown) => {
    engine = undefined; // Permite reintentar si falló la carga.
    throw error;
  });
  return engine;
}

/** JPEG/PNG → tensor RGB [alto, ancho, 3], reducido a MAX_SIDE. */
function toTensor(buffer: Buffer): tf.Tensor3D {
  const kind = detectFileKind(buffer);
  let width: number;
  let height: number;
  let rgb: Uint8Array;
  if (kind === 'jpg') {
    const image = jpeg.decode(buffer, {
      useTArray: true,
      formatAsRGBA: false,
      maxMemoryUsageInMB: 256,
    });
    ({ width, height } = image);
    rgb = image.data;
  } else if (kind === 'png') {
    const image = PNG.sync.read(buffer);
    ({ width, height } = image);
    rgb = new Uint8Array(width * height * 3);
    for (let src = 0, dst = 0; src < image.data.length; src += 4) {
      rgb[dst++] = image.data[src];
      rgb[dst++] = image.data[src + 1];
      rgb[dst++] = image.data[src + 2];
    }
  } else {
    throw new BadRequestException('La imagen debe ser JPEG o PNG');
  }

  const scale = MAX_SIDE / Math.max(width, height);
  return tf.tidy(() => {
    const tensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
    if (scale >= 1) return tensor;
    const resized = tf.image.resizeBilinear(tensor, [
      Math.round(height * scale),
      Math.round(width * scale),
    ]);
    return tf.cast(resized, 'int32');
  });
}

/** Gira 90° a la derecha: fotos de celular con la orientación solo en EXIF. */
const rotate90 = (tensor: tf.Tensor3D) =>
  tf.tidy(() => tf.reverse(tf.transpose(tensor, [1, 0, 2]), 1));

async function detectFaces(tensor: tf.Tensor3D): Promise<FaceResult[]> {
  const faces = await faceapi
    .detectAllFaces(
      // Mismo objeto en ejecución; face-api trae su propia copia de los tipos de tfjs.
      tensor as unknown as faceapi.TNetInput,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: MIN_DETECTION_CONFIDENCE,
      }),
    )
    .withFaceLandmarks()
    .withFaceDescriptors();
  // El más grande primero: en una foto de cédula es el retrato principal.
  return faces.sort((a, b) => b.detection.box.area - a.detection.box.area);
}

/**
 * Comparación facial real con face-api (SSD MobileNet + landmarks + descriptor
 * de 128 dimensiones), en WASM: no requiere binarios nativos ni GPU.
 *
 * La captura debe tener exactamente un rostro. En la referencia (cédula) se usa
 * el rostro más grande, porque la cédula ecuatoriana trae además un retrato
 * fantasma pequeño; si no aparece ninguno se prueba girando la imagen.
 *
 * ponytail: livenessScore es por ahora la confianza de detección de la captura
 * (calidad del rostro), no una prueba de vida. La prueba de vida real llega con
 * el reto de varios fotogramas.
 */
@Injectable()
export class FaceApiBiometricProvider implements BiometricProvider {
  readonly name = 'faceapi';

  async assess({
    selfie,
    reference,
  }: BiometricCapture): Promise<BiometricAssessment> {
    await loadEngine();
    const captured = await this.facesIn(selfie, false);
    if (captured.length === 0) {
      throw new BadRequestException(
        'No se detectó un rostro en la captura. Ubícate de frente, con buena luz y sin cubrirte la cara.',
      );
    }
    if (captured.length > 1) {
      throw new BadRequestException(
        'La captura tiene más de un rostro. Asegúrate de estar solo frente a la cámara.',
      );
    }
    const [referenceFace] = await this.facesIn(reference, true);
    if (!referenceFace) {
      throw new BadRequestException(
        'No se detectó un rostro en la foto de la cédula. Carga una foto nítida y completa del lado frontal.',
      );
    }

    const [face] = captured;
    const distance = faceapi.euclideanDistance(
      face.descriptor,
      referenceFace.descriptor,
    );
    return {
      provider: this.name,
      livenessScore: round2(face.detection.score * 100),
      matchScore: distanceToScore(distance),
    };
  }

  /** Rostros de la imagen; con `tryRotations` prueba 90°, 180° y 270° si no halla ninguno. */
  private async facesIn(buffer: Buffer, tryRotations: boolean) {
    let tensor = toTensor(buffer);
    try {
      for (let turn = 0; turn < (tryRotations ? 4 : 1); turn++) {
        if (turn > 0) {
          const rotated = rotate90(tensor);
          tensor.dispose();
          tensor = rotated;
        }
        const faces = await detectFaces(tensor);
        if (faces.length) return faces;
      }
      return [];
    } finally {
      tensor.dispose();
    }
  }
}
