import { BadRequestException } from '@nestjs/common';
import jpeg from 'jpeg-js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import {
  distanceToScore,
  FaceApiBiometricProvider,
} from './face-api.provider.js';

/**
 * Fotos de muestra que trae @vladmandic/face-api. `sample6.jpg` es un grupo de
 * cuatro personas; las cajas son las que devuelve el detector sobre la foto
 * completa y sirven para recortar "selfies" de cada una.
 */
const demo = join(
  dirname(
    createRequire(import.meta.url).resolve('@vladmandic/face-api/package.json'),
  ),
  'demo',
);
const group = readFileSync(join(demo, 'sample6.jpg'));
const image = jpeg.decode(group, { useTArray: true, formatAsRGBA: true });
const PERSON_A = { x: 681, y: 321, width: 159, height: 306 };
const PERSON_B = { x: 250, y: 467, width: 210, height: 291 };
/** Mirando de frente (yaw ≈ 0.54); A y B tienen la cabeza girada. */
const PERSON_C = { x: 1181, y: 305, width: 188, height: 280 };

type Box = typeof PERSON_A;

/** Recorta el rostro con un margen relativo; `quality` distinta simula otra toma. */
function crop(box: Box, pad: number, quality: number, rotate = false) {
  const x0 = Math.max(0, Math.round(box.x - box.width * pad));
  const y0 = Math.max(0, Math.round(box.y - box.height * pad));
  const x1 = Math.min(image.width, Math.round(box.x + box.width * (1 + pad)));
  const y1 = Math.min(image.height, Math.round(box.y + box.height * (1 + pad)));
  const [w, h] = [x1 - x0, y1 - y0];
  const [outW, outH] = rotate ? [h, w] : [w, h];
  const data = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((y0 + y) * image.width + (x0 + x)) * 4;
      // Giro de 90° a la izquierda: el proveedor debe enderezarlo solo.
      const [dx, dy] = rotate ? [y, w - 1 - x] : [x, y];
      data.set(image.data.subarray(src, src + 4), (dy * outW + dx) * 4);
    }
  }
  return { data, width: outW, height: outH, quality };
}

const asJpeg = (raw: ReturnType<typeof crop>) =>
  jpeg.encode(raw, raw.quality).data;

const asPng = (raw: ReturnType<typeof crop>) => {
  const png = new PNG({ width: raw.width, height: raw.height });
  raw.data.copy(png.data);
  return PNG.sync.write(png);
};

describe('distanceToScore', () => {
  it('vale 100 en distancia 0 y 75 en el umbral calibrado', () => {
    expect(distanceToScore(0)).toBe(100);
    expect(distanceToScore(0.45)).toBe(75);
  });

  it('no baja de 0 con distancias grandes', () => {
    expect(distanceToScore(5)).toBe(0);
  });
});

// Carga modelos reales (WASM): más lenta que el resto de pruebas unitarias.
describe('FaceApiBiometricProvider', { timeout: 60_000 }, () => {
  const provider = new FaceApiBiometricProvider();
  const selfieA = asJpeg(crop(PERSON_A, 0.5, 90));
  const selfieC = asJpeg(crop(PERSON_C, 0.4, 90));
  /** Comparación sin gestos: solo se evalúa la coincidencia con la referencia. */
  const match = (selfie: Buffer, reference: Buffer) =>
    provider.assess({ frames: [selfie], challenges: [], reference });

  it('reconoce a la misma persona en dos tomas distintas', async () => {
    const result = await match(selfieA, asJpeg(crop(PERSON_A, 0.3, 45)));
    expect(result.provider).toBe('faceapi');
    expect(result.matchScore).toBeGreaterThanOrEqual(75);
  });

  it('no confunde a otra persona', async () => {
    const result = await match(selfieA, asJpeg(crop(PERSON_B, 0.3, 90)));
    expect(result.matchScore).toBeLessThan(75);
  });

  it('acepta la referencia en PNG y girada', async () => {
    const result = await match(selfieA, asPng(crop(PERSON_A, 0.3, 90, true)));
    expect(result.matchScore).toBeGreaterThanOrEqual(75);
  });

  it('rechaza una captura con más de un rostro', async () => {
    await expect(match(group, selfieA)).rejects.toThrow(/más de un rostro/);
  });

  it('rechaza una captura sin rostro', async () => {
    // Esquina de la persiana: sin personas.
    const blinds = asJpeg(
      crop({ x: 450, y: 20, width: 200, height: 200 }, 0, 90),
    );
    await expect(match(blinds, selfieA)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza una referencia sin rostro', async () => {
    const blinds = asJpeg(
      crop({ x: 450, y: 20, width: 200, height: 200 }, 0, 90),
    );
    await expect(match(selfieA, blinds)).rejects.toThrow(/cédula/);
  });

  describe('prueba de vida', () => {
    it('de frente y sin gestos pedidos pasa con puntaje alto', async () => {
      const result = await match(selfieC, selfieC);
      expect(result.livenessFailure).toBeNull();
      expect(result.livenessScore).toBeGreaterThanOrEqual(90);
    });

    it('exige que la primera captura sea de frente', async () => {
      const result = await match(selfieA, selfieA);
      expect(result.livenessFailure).toMatch(/de frente/);
      expect(result.livenessScore).toBeLessThan(60);
    });

    it('detecta que no se hizo el gesto pedido', async () => {
      const result = await provider.assess({
        frames: [selfieC, asJpeg(crop(PERSON_C, 0.5, 80))],
        challenges: ['TURN_LEFT'],
        reference: selfieC,
      });
      expect(result.livenessFailure).toMatch(/girar la cabeza a la izquierda/);
      expect(result.livenessScore).toBeLessThan(60);
    });

    it('detecta que otra persona hizo el gesto', async () => {
      const result = await provider.assess({
        frames: [selfieC, selfieA],
        challenges: ['TURN_RIGHT'],
        reference: selfieC,
      });
      expect(result.livenessFailure).toMatch(/misma persona/);
    });
  });
});
