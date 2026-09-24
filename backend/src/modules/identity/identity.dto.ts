import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IdentityStatus } from '../../generated/prisma/enums.js';

export class VerifyIdentityDto {
  /** Captura facial en vivo, JPEG/PNG en base64 (con o sin prefijo data URL). */
  @IsString() @IsNotEmpty() @MaxLength(7_000_000) selfieBase64: string;
  /** Aceptación expresa del tratamiento de datos biométricos (LOPDP). */
  @ApiProperty({ enum: [true] })
  @Equals(true, {
    message: 'Debes aceptar el tratamiento de tus datos biométricos',
  })
  consent: boolean;
}

/** Campo multipart con la foto del lado frontal de la cédula (JPEG o PNG, máx. 5 MB). */
export class UploadIdentityDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  idFront: unknown;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class IdentityStatusResponse {
  @ApiProperty({ enum: IdentityStatus, enumName: 'IdentityStatus' })
  status: IdentityStatus;
  verifiedAt: Date | null;
  /** Ya cargó la foto de la cédula frontal. */
  hasDocument: boolean;
  /** @example 3 */
  remainingAttempts: number;
  /** @example 5 */
  maxAttempts: number;
}

export class IdentityVerifyResponse extends IdentityStatusResponse {
  passed: boolean;
  /** @example "92.41" */
  matchScore: string;
  /** @example "96.10" */
  livenessScore: string;
  /** Umbral que no se alcanzó, o null si pasó. */
  failureReason: string | null;
}
