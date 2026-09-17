import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../generated/prisma/enums.js';

/** El correo identifica al usuario: se normaliza para que `A@X.com` y `a@x.com` sean el mismo. */
const NormalizedEmail = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/**
 * Longitud mínima 12 y máxima 128, sin reglas de composición: NIST SP 800-63B
 * desaconseja exigir mayúsculas/símbolos y recomienda premiar la longitud.
 */
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

export class RegisterDto {
  /** @example "María José Andrade" */
  @IsString() @IsNotEmpty() @MaxLength(200) fullName: string;
  /** @example "maria.andrade@example.com" */
  @IsEmail() @MaxLength(254) @NormalizedEmail() email: string;
  /** Mínimo 12 caracteres. @example "cafe-con-pan-1892" */
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class LoginDto {
  /** @example "maria.andrade@example.com" */
  @IsEmail() @MaxLength(254) @NormalizedEmail() email: string;
  /** @example "cafe-con-pan-1892" */
  @IsString() @IsNotEmpty() @MaxLength(PASSWORD_MAX) password: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() @MaxLength(PASSWORD_MAX) currentPassword: string;
  /** Mínimo 12 caracteres; cierra todas las sesiones abiertas. */
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  newPassword: string;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class UserResponse {
  /** @example "9f1c0b6e-4f7a-4f5e-9a1d-8d4a2f6b3c11" */
  id: string;
  /** @example "maria.andrade@example.com" */
  email: string;
  fullName: string;
  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export class SessionResponse {
  user: UserResponse;
  /** Segundos de vida del access token recién emitido. @example 900 */
  accessTokenExpiresIn: number;
}
