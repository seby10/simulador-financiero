import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ApplicationStatus,
  BiometricStatus,
  LivenessPurpose,
} from '../../generated/prisma/enums.js';
import { CHALLENGES, type Challenge } from './liveness.js';

export class CreateLivenessSessionDto {
  /** Flujo en el que se usará: la sesión no sirve en otro. */
  @ApiProperty({ enum: LivenessPurpose, enumName: 'LivenessPurpose' })
  @IsEnum(LivenessPurpose)
  purpose: LivenessPurpose;
}

/** Captura en vivo con prueba de vida: la comparten registro, recuperación y solicitudes. */
export class LiveCaptureDto {
  /** Sesión abierta con POST /biometrics/liveness-sessions (un solo uso). */
  @IsUUID('4') livenessSessionId: string;
  /**
   * Fotogramas JPEG/PNG en base64: el primero mirando de frente y luego uno por
   * cada gesto de la sesión, en el mismo orden.
   */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(3_000_000, { each: true })
  frames: string[];
}

export class BiometricsDto extends LiveCaptureDto {}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class LivenessSessionResponse {
  sessionId: string;
  /** Gestos a realizar, en orden. */
  @ApiProperty({ enum: CHALLENGES, isArray: true })
  challenges: Challenge[];
  expiresAt: Date;
}

export class BiometricChecksDto {
  /** PASSED o FAILED según el umbral de vivacidad. @example "PASSED" */
  liveness: string;
  /** MATCH o NO_MATCH según el umbral de coincidencia. @example "MATCH" */
  faceMatch: string;
}

export class BiometricsResponse {
  applicationId: string;
  /** Número de intento, empezando en 1. @example 1 */
  attempt: number;
  passed: boolean;
  /** @example "92.41" */
  livenessScore: string;
  /** @example "95.07" */
  matchScore: string;
  /** Estado de la solicitud; la biometría no lo cambia, lo decide un administrador. */
  @ApiProperty({ enum: ApplicationStatus, enumName: 'ApplicationStatus' })
  status: ApplicationStatus;
  /** VERIFIED si este intento pasó; FAILED si agotó los intentos. */
  @ApiProperty({ enum: BiometricStatus, enumName: 'BiometricStatus' })
  biometricStatus: BiometricStatus;
  /** Intentos que aún quedan disponibles. @example 2 */
  remainingAttempts: number;
  checks: BiometricChecksDto;
  /** Umbral que no se alcanzó, o null si la verificación pasó. */
  failureReason: string | null;
}

export class BiometricAttemptResponse {
  id: string;
  attempt: number;
  passed: boolean;
  /** @example "92.41" */
  livenessScore: string;
  /** @example "95.07" */
  matchScore: string;
  failureReason: string | null;
  /** @example "simulated" */
  provider: string;
  createdAt: Date;
}
