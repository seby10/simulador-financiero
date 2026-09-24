import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsEmail,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { LivenessPurpose } from '../../generated/prisma/enums.js';

/** Traspaso de una cuenta con sesión: confirmar identidad o verificar una solicitud. */
export class CreateHandoffDto {
  @ApiProperty({
    enum: [LivenessPurpose.IDENTITY, LivenessPurpose.APPLICATION],
  })
  @IsIn([LivenessPurpose.IDENTITY, LivenessPurpose.APPLICATION])
  purpose: 'IDENTITY' | 'APPLICATION';

  /** Solicitud a verificar (solo APPLICATION). */
  @ValidateIf((dto: CreateHandoffDto) => dto.purpose === 'APPLICATION')
  @IsUUID('4')
  applicationId?: string;

  /** Aceptación del tratamiento de datos biométricos (solo IDENTITY). */
  @ValidateIf((dto: CreateHandoffDto) => dto.purpose === 'IDENTITY')
  @Equals(true, {
    message: 'Debes aceptar el tratamiento de tus datos biométricos',
  })
  consent?: boolean;
}

/** Traspaso de la recuperación de clave: sin sesión, solo con el correo. */
export class CreateResetHandoffDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}

export class HandoffPollDto {
  /** Secreto que devolvió la creación del traspaso; solo lo conoce la computadora. */
  @IsString() @MaxLength(100) pollToken: string;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class HandoffCreatedResponse {
  handoffId: string;
  /** Va en el QR: /verify-mobile?t=... */
  mobileToken: string;
  /** Se queda en la computadora para consultar el resultado. */
  pollToken: string;
  expiresAt: Date;
}

export class HandoffStatusResponse {
  /** PENDING mientras el celular no termine; COMPLETED al pasar la verificación. */
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  /** Resultado del flujo (en recuperación incluye resetToken una sola vez). */
  result: Record<string, unknown> | null;
}

export class HandoffMobileInfoResponse {
  @ApiProperty({ enum: LivenessPurpose, enumName: 'LivenessPurpose' })
  purpose: LivenessPurpose;
  /** Primer nombre del titular, para saludar (no se envía en recuperación). */
  firstName: string | null;
  completed: boolean;
  expiresAt: Date;
}
