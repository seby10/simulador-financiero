import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** Token de inyección: cambiar de proveedor es cambiar esta sola línea del módulo. */
export const BIOMETRIC_PROVIDER = Symbol('BIOMETRIC_PROVIDER');

export interface BiometricCapture {
  /** Selfie en vivo enviada por el solicitante. */
  selfie: Buffer;
  /** Documento de identidad ya cargado, contra el que se compara. */
  reference: Buffer;
}

export interface BiometricAssessment {
  /** Probabilidad de que sea una persona viva y no una foto (0–100). */
  livenessScore: number;
  /** Coincidencia facial contra el documento (0–100). */
  matchScore: number;
  provider: string;
}

export interface BiometricProvider {
  assess(capture: BiometricCapture): Promise<BiometricAssessment>;
}

/** Rango de puntajes que devuelve la simulación. */
const FLOOR = 70;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Escala un entero de 16 bits al rango [FLOOR, 100). */
const scale = (raw: number) => round2(FLOOR + (raw / 0x10000) * (100 - FLOOR));

/**
 * ponytail: sin proveedor biométrico real. Los puntajes se derivan del SHA-256
 * de las imágenes en lugar de ser aleatorios, así la misma captura da siempre el
 * mismo resultado: las pruebas son reproducibles y en una demo se puede enseñar
 * tanto una verificación que pasa como una que falla.
 *
 * Al enchufar un SDK real (liveness + matching) basta con implementar esta misma
 * interfaz y sustituir el proveedor en BiometricsModule.
 */
@Injectable()
export class SimulatedBiometricProvider implements BiometricProvider {
  readonly name = 'simulated';

  assess({
    selfie,
    reference,
  }: BiometricCapture): Promise<BiometricAssessment> {
    const digest = createHash('sha256')
      .update(selfie)
      .update(reference)
      .digest();
    return Promise.resolve({
      provider: this.name,
      livenessScore: scale(digest.readUInt16BE(0)),
      matchScore: scale(digest.readUInt16BE(2)),
    });
  }
}
