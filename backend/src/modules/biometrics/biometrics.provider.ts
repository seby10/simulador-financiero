import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Challenge } from './liveness.js';

/** Token de inyección: cambiar de proveedor es cambiar esta sola línea del módulo. */
export const BIOMETRIC_PROVIDER = Symbol('BIOMETRIC_PROVIDER');

export interface BiometricCapture {
  /**
   * Fotogramas en vivo: el primero de frente (se compara con la referencia),
   * luego uno por cada gesto de `challenges` en el mismo orden y, opcionalmente,
   * uno final de nuevo de frente.
   */
  frames: Buffer[];
  /** Gestos que pidió el servidor en la sesión de prueba de vida. */
  challenges: Challenge[];
  /** Imagen contra la que se compara: cédula o selfie verificada. */
  reference: Buffer;
}

export interface BiometricAssessment {
  /** Probabilidad de que sea una persona viva y no una foto (0–100). */
  livenessScore: number;
  /** Qué falló en la prueba de vida, si el proveedor lo sabe. */
  livenessFailure?: string | null;
  /** Coincidencia facial contra el documento (0–100). */
  matchScore: number;
  provider: string;
}

export interface BiometricProvider {
  assess(capture: BiometricCapture): Promise<BiometricAssessment>;
  /** Rechaza (400) una referencia en la que no se puede encontrar el rostro. */
  inspectReference?(reference: Buffer): Promise<void>;
}

/** Rango de puntajes que devuelve la simulación. */
const FLOOR = 70;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Escala un entero de 16 bits al rango [FLOOR, 100). */
const scale = (raw: number) => round2(FLOOR + (raw / 0x10000) * (100 - FLOOR));

/**
 * Doble de pruebas (BIOMETRIC_PROVIDER=simulated): no mira rostros. Los puntajes
 * se derivan del SHA-256 de las imágenes en lugar de ser aleatorios, así la misma
 * captura da siempre el mismo resultado y las pruebas e2e son reproducibles sin
 * fotos reales. La comparación real está en FaceApiBiometricProvider.
 */
@Injectable()
export class SimulatedBiometricProvider implements BiometricProvider {
  readonly name = 'simulated';

  /** Solo mira el primer fotograma: los gestos no se pueden simular con un hash. */
  assess({
    frames,
    reference,
  }: BiometricCapture): Promise<BiometricAssessment> {
    const digest = createHash('sha256')
      .update(frames[0])
      .update(reference)
      .digest();
    return Promise.resolve({
      provider: this.name,
      livenessScore: scale(digest.readUInt16BE(0)),
      matchScore: scale(digest.readUInt16BE(2)),
    });
  }
}
