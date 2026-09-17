import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma/enums.js';

export class BiometricsDto {
  /** Captura facial JPEG/PNG en base64 (con o sin prefijo data URL). @example "data:image/jpeg;base64,/9j/4AAQSkZJRg..." */
  @IsString() @IsNotEmpty() @MaxLength(7_000_000) selfieBase64: string;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

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
  /** Estado de la solicitud tras el intento. */
  @ApiProperty({ enum: ApplicationStatus, enumName: 'ApplicationStatus' })
  status: ApplicationStatus;
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
