import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsCedula } from '../../common/validation/cedula.js';
import { LiveCaptureDto } from '../biometrics/biometrics.dto.js';
import { IdentityStatus, UserRole } from '../../generated/prisma/enums.js';

/** El correo identifica al usuario: se normaliza para que `A@X.com` y `a@x.com` sean el mismo. */
const NormalizedEmail = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

const Trimmed = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/**
 * Longitud mínima 8 (el piso de NIST SP 800-63B) y máxima 128, sin reglas de
 * composición: NIST desaconseja exigir mayúsculas/símbolos y premia la longitud.
 */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export class RegisterDto {
  /** Cédula ecuatoriana; una cuenta por titular. @example "1710034065" */
  @IsCedula() idNumber: string;
  /** @example "María José" */
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  /** @example "Andrade" */
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  /** @example "0991234567" */
  @Matches(/^\+?\d{7,15}$/, {
    message: 'phone debe tener entre 7 y 15 dígitos',
  })
  phone: string;
  /** @example "Av. Amazonas y Colón" */
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) address?: string;
  /** @example "maria.andrade@example.com" */
  @IsEmail() @MaxLength(254) @NormalizedEmail() email: string;
  /** Mínimo 8 caracteres. @example "cafe-con-pan-1892" */
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
  /** Mínimo 8 caracteres; cierra todas las sesiones abiertas. */
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  newPassword: string;
}

export class BiometricResetVerifyDto extends LiveCaptureDto {
  /** @example "maria.andrade@example.com" */
  @IsEmail() @MaxLength(254) @NormalizedEmail() email: string;
}

export class BiometricResetConfirmDto {
  /** Token de un solo uso devuelto por `biometric-reset/verify`. */
  @IsString() @IsNotEmpty() @MaxLength(100) resetToken: string;
  /** Mínimo 8 caracteres; cierra todas las sesiones abiertas. */
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  newPassword: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserStatusDto {
  /** false cierra todas las sesiones del usuario. */
  @IsBoolean() isActive: boolean;
}

export class CreateUserAdminDto extends RegisterDto {
  /** CUSTOMER si se omite. */
  @ApiProperty({ enum: UserRole, enumName: 'UserRole', required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class UserResponse {
  /** @example "9f1c0b6e-4f7a-4f5e-9a1d-8d4a2f6b3c11" */
  id: string;
  /** @example "maria.andrade@example.com" */
  email: string;
  /** Nombres y apellidos. @example "María José Andrade" */
  fullName: string;
  /** Null solo en cuentas administrativas creadas por el seed. */
  idNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;
  isActive: boolean;
  /** Mientras no sea VERIFIED el cliente debe confirmar su identidad para operar. */
  @ApiProperty({ enum: IdentityStatus, enumName: 'IdentityStatus' })
  identityStatus: IdentityStatus;
  identityVerifiedAt: Date | null;
  createdAt: Date;
}

export class SessionResponse {
  user: UserResponse;
  /** Segundos de vida del access token recién emitido. @example 900 */
  accessTokenExpiresIn: number;
}

export class BiometricResetVerifyResponse {
  /** Úselo en `biometric-reset/confirm` antes de que expire (15 min). */
  resetToken: string;
  /** @example "2026-09-23T18:30:00.000Z" */
  expiresAt: Date;
  /** @example "92.41" */
  matchScore: string;
}
