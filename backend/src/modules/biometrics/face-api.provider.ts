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
import { CHALLENGE_LABELS, challengeMet, isFrontal } from './liveness.js';

// face-api.node-wasm usa esta misma instancia de tfjs (no la empaqueta).
const require = createRequire(import.meta.url);

/** Pesos de los modelos: vienen dentro del paquete, no se descargan en tiempo de ejecución. */
const MODEL_DIR = join(
  dirname(require.resolve('@vladmandic/face-api/package.json')),
  'model',
);

/** Lado mayor con el que se buscan rostros: más grande solo gasta memoria. */
const MAX_SIDE = 1280;
/** Lado mayor con el que se decodifica la cédula para recortar el retrato con detalle. */
const REFERENCE_MAX_SIDE = 4096;
/** Tamaño del recorte del retrato de la cédula antes de sacar su descriptor. */
const PORTRAIT_SIDE = 512;
const MIN_DETECTION_CONFIDENCE = 0.5;

/**
 * Un segundo rostro solo invalida la captura si es claro (confianza alta) y de
 * tamaño comparable al principal: una persona pasando al fondo, un cuadro o un
 * falso positivo pequeño no deben tumbar la verificación.
 */
const EXTRA_FACE_CONFIDENCE = 0.7;
const EXTRA_FACE_AREA_RATIO = 0.25;

/**
 * Distancia euclidiana entre descriptores que vale 75 puntos (el umbral por
 * defecto de BIOMETRIC_MATCH_MIN). Con las fotos de muestra del paquete la
 * misma persona quedó entre 0.05 y 0.35 y personas distintas desde 0.47, pero
 * una cédula real (impresa, con hologramas, foto de años atrás) aleja más al
 * titular de su selfie; 0.5 lo acepta sin llegar al 0.6 habitual de face-api.
 * Se calibra por entorno con FACE_MATCH_DISTANCE.
 */
const distanceAtThreshold = () => {
  const raw = Number(process.env.FACE_MATCH_DISTANCE);
  return raw > 0 && raw < 1 ? raw : 0.5;
};

/** Los dos fotogramas de frente (inicio y cierre) deben ser claramente la misma cara. */
const FRONTAL_CONTINUITY_DISTANCE = 0.5;
/**
 * Un giro de cabeza cambia mucho el descriptor: aquí solo se descarta que otra
 * persona haya hecho el gesto. La continuidad fuerte la dan los dos frontales.
 */
const GESTURE_CONTINUITY_DISTANCE = 0.68;

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

/** 0 → 100 puntos, el umbral de distancia → 75, y baja linealmente desde ahí. */
export const distanceToScore = (distance: number) =>
  round2(clamp(100 - (distance / distanceAtThreshold()) * 25));

/** Promedio de descriptores: dos tomas de frente dan una muestra más estable que una. */
const meanDescriptor = (descriptors: Float32Array[]) => {
  const mean = new Float32Array(descriptors[0].length);
  for (const descriptor of descriptors) {
    descriptor.forEach((value, i) => (mean[i] += value / descriptors.length));
  }
  return mean;
};

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

/** JPEG/PNG → tensor RGB [alto, ancho, 3], reducido a `maxSide`. */
function toTensor(buffer: Buffer, maxSide = MAX_SIDE): tf.Tensor3D {
  const kind = detectFileKind(buffer);
  let width: number;
  let height: number;
  let rgb: Uint8Array;
  if (kind === 'jpg') {
    const image = jpeg.decode(buffer, {
      useTArray: true,
      formatAsRGBA: false,
      maxMemoryUsageInMB: 512,
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

  const tensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
  const { small } = downscale(tensor, maxSide);
  if (small !== tensor) tensor.dispose();
  return small;
}

/** Reduce el tensor para que su lado mayor no pase de `maxSide`; devuelve la escala aplicada. */
function downscale(tensor: tf.Tensor3D, maxSide: number) {
  const [height, width] = tensor.shape;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  if (scale === 1) return { small: tensor, scale };
  const small = tf.tidy(() =>
    tf.cast(
      tf.image.resizeBilinear(tensor, [
        Math.round(height * scale),
        Math.round(width * scale),
      ]),
      'int32',
    ),
  ) as tf.Tensor3D;
  return { small, scale };
}

/** Gira 90° a la derecha: fotos de celular con la orientación solo en EXIF. */
const rotate90 = (tensor: tf.Tensor3D) =>
  tf.tidy(() => tf.reverse(tf.transpose(tensor, [1, 0, 2]), 1));

/**
 * Recorta el rostro de la imagen a resolución completa (con margen para que el
 * detector vea la cabeza entera) y lo lleva a PORTRAIT_SIDE. En una cédula
 * fotografiada el retrato ocupa poco: buscarlo en la imagen reducida y sacar
 * el descriptor del recorte grande conserva mucho más detalle del rostro.
 */
function cropPortrait(full: tf.Tensor3D, box: faceapi.Box, scale: number) {
  const [height, width] = full.shape;
  const margin = 0.45;
  const x = (box.x - box.width * margin) / scale;
  const y = (box.y - box.height * margin) / scale;
  const w = (box.width * (1 + 2 * margin)) / scale;
  const h = (box.height * (1 + 2 * margin)) / scale;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  const factor = PORTRAIT_SIDE / Math.max(y1 - y0, x1 - x0);
  return tf.tidy(() =>
    tf.cast(
      tf.image.resizeBilinear(
        tf.slice(full, [y0, x0, 0], [y1 - y0, x1 - x0, 3]),
        [
          Math.max(1, Math.round((y1 - y0) * factor)),
          Math.max(1, Math.round((x1 - x0) * factor)),
        ],
      ),
      'int32',
    ),
  ) as tf.Tensor3D;
}

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
 * Deja fuera los rostros que no deberían contar como "otra persona": poco
 * seguros o mucho más pequeños que el principal (ver EXTRA_FACE_*).
 */
export function relevantFaces<
  T extends { detection: { score: number; box: { area: number } } },
>(faces: T[]): T[] {
  const [main, ...rest] = faces;
  if (!main) return faces;
  return [
    main,
    ...rest.filter(
      (face) =>
        face.detection.score >= EXTRA_FACE_CONFIDENCE &&
        face.detection.box.area >=
          main.detection.box.area * EXTRA_FACE_AREA_RATIO,
    ),
  ];
}

/**
 * Comparación facial real con face-api (SSD MobileNet + landmarks + descriptor
 * de 128 dimensiones), en WASM: no requiere binarios nativos ni GPU.
 *
 * Cada fotograma debe tener un solo rostro relevante. En la referencia (cédula)
 * se usa el rostro más grande, porque la cédula ecuatoriana trae además un
 * retrato fantasma pequeño; si no aparece ninguno se prueba girando la imagen,
 * y el descriptor sale de un recorte del retrato a resolución completa.
 *
 * Prueba de vida activa: el primer fotograma debe ser de frente, cada uno de
 * los siguientes debe mostrar el gesto pedido y, si llega, el último vuelve a
 * ser de frente. Los dos frontales se comparan entre sí (misma persona de
 * principio a fin) y su promedio es lo que se contrasta con la cédula. Esto
 * detiene una foto impresa o en pantalla (no gira ni sonríe a pedido); no
 * sustituye a un detector pasivo certificado (ISO/IEC 30107-3) contra máscaras
 * o deepfakes en tiempo real.
 */
@Injectable()
export class FaceApiBiometricProvider implements BiometricProvider {
  readonly name = 'faceapi';

  async assess({
    frames,
    challenges,
    reference,
  }: BiometricCapture): Promise<BiometricAssessment> {
    await loadEngine();
    const faces: FaceResult[] = [];
    for (const frame of frames) faces.push(await this.singleFace(frame));
    const referenceFace = await this.referenceFace(reference);

    const [neutral, ...rest] = faces;
    const gestures = rest.slice(0, challenges.length);
    const closing = rest[challenges.length] ?? null;
    const frontal = closing ? [neutral, closing] : [neutral];
    const distance = faceapi.euclideanDistance(
      meanDescriptor(frontal.map((face) => face.descriptor)),
      referenceFace.descriptor,
    );
    return {
      provider: this.name,
      ...this.liveness(neutral, gestures, closing, challenges),
      matchScore: distanceToScore(distance),
    };
  }

  /** Falla con un mensaje claro si la foto de la cédula no sirve de referencia. */
  async inspectReference(reference: Buffer) {
    await loadEngine();
    await this.referenceFace(reference);
  }

  /**
   * Todas las comprobaciones pasan → 90–100 según la nitidez de los rostros.
   * Si alguna falla el puntaje queda por debajo de 60 y se informa la primera.
   */
  private liveness(
    neutral: FaceResult,
    gestures: FaceResult[],
    closing: FaceResult | null,
    challenges: BiometricCapture['challenges'],
  ) {
    const points = (face: FaceResult) => face.landmarks.positions;
    const distanceToNeutral = (face: FaceResult) =>
      faceapi.euclideanDistance(face.descriptor, neutral.descriptor);
    const checks: [boolean, string][] = [
      [
        isFrontal(points(neutral)),
        'La primera captura debe ser mirando de frente a la cámara',
      ],
      ...(closing
        ? [
            [
              isFrontal(points(closing)) &&
                distanceToNeutral(closing) <= FRONTAL_CONTINUITY_DISTANCE,
              'Al final debes volver a mirar de frente a la cámara',
            ] as [boolean, string],
          ]
        : []),
      [
        gestures.every(
          (face) => distanceToNeutral(face) <= GESTURE_CONTINUITY_DISTANCE,
        ),
        'Las capturas no corresponden a la misma persona',
      ],
      ...challenges.map((challenge, i): [boolean, string] => [
        challengeMet(challenge, points(gestures[i]), points(neutral)),
        `No se detectó el gesto pedido: ${CHALLENGE_LABELS[challenge]}`,
      ]),
    ];
    const failed = checks.find(([ok]) => !ok);
    if (!failed) {
      const sharpness = Math.min(
        ...[neutral, ...gestures, ...(closing ? [closing] : [])].map(
          (face) => face.detection.score,
        ),
      );
      return {
        livenessScore: round2(90 + sharpness * 10),
        livenessFailure: null,
      };
    }
    const passed = checks.filter(([ok]) => ok).length;
    return {
      livenessScore: round2((60 * passed) / checks.length),
      livenessFailure: failed[1],
    };
  }

  /**
   * Rostro de la cédula: se busca en la imagen reducida (probando giros) y el
   * descriptor sale del retrato recortado a resolución completa.
   */
  private async referenceFace(reference: Buffer) {
    const full = toTensor(reference, REFERENCE_MAX_SIDE);
    let oriented = full;
    try {
      for (let turn = 0; turn < 4; turn++) {
        if (turn > 0) {
          const rotated = rotate90(oriented);
          if (oriented !== full) oriented.dispose();
          oriented = rotated;
        }
        const { small, scale } = downscale(oriented, MAX_SIDE);
        let found: FaceResult | undefined;
        try {
          [found] = await detectFaces(small);
        } finally {
          if (small !== oriented) small.dispose();
        }
        if (!found) continue;
        const portrait = cropPortrait(oriented, found.detection.box, scale);
        try {
          const [sharper] = await detectFaces(portrait);
          return sharper ?? found;
        } finally {
          portrait.dispose();
        }
      }
    } finally {
      if (oriented !== full) oriented.dispose();
      full.dispose();
    }
    throw new BadRequestException(
      'No encontramos el retrato en la foto de tu cédula. Toma la foto de frente, con toda la cédula dentro del marco, bien enfocada y sin reflejos.',
    );
  }

  /** Un solo rostro relevante por fotograma; si no, el problema es de la toma. */
  private async singleFace(frame: Buffer) {
    const faces = relevantFaces(await this.facesIn(frame));
    if (faces.length === 0) {
      throw new BadRequestException(
        'No se detectó un rostro en la captura. Ubícate de frente, con buena luz y sin cubrirte la cara.',
      );
    }
    if (faces.length > 1) {
      throw new BadRequestException(
        'Detectamos a otra persona junto a ti. Haz la verificación solo frente a la cámara.',
      );
    }
    return faces[0];
  }

  /** Rostros de un fotograma en vivo, el más grande primero. */
  private async facesIn(buffer: Buffer) {
    const tensor = toTensor(buffer);
    try {
      return await detectFaces(tensor);
    } finally {
      tensor.dispose();
    }
  }
}
