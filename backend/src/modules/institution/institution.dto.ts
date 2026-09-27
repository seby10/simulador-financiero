import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  IsHexColor,
  IsOptionalImageUrl,
} from '../../common/validation/branding.js';

export class UpdateInstitutionDto {
  /** @example "Cooperativa de Ahorro y Crédito Andina" */
  @IsString() @IsNotEmpty() @MaxLength(200) institutionName: string;
  /** @example "1790000000001" */
  @Matches(/^\d{13}$/, { message: '$property debe tener 13 dígitos' })
  ruc: string;
  @IsString() @IsNotEmpty() @MaxLength(200) legalRepresentative: string;
  @IsString() @IsNotEmpty() @MaxLength(300) address: string;
  /** @example "+593 2 250 0000" */
  @Matches(/^\+?[\d\s-]{7,20}$/, {
    message: '$property no tiene un formato válido',
  })
  phone: string;
  @IsEmail() email: string;
  /** Texto legal impreso en los PDF. */
  @IsString() @IsNotEmpty() @MaxLength(2000) disclaimerText: string;
  // ── Marca: colores del sitio público y del panel ──
  @IsOptional() @IsHexColor() primaryColor?: string;
  @IsOptional() @IsHexColor() secondaryColor?: string;
  @IsOptional() @IsHexColor() accentColor?: string;
  @IsOptional() @IsHexColor() navbarBgColor?: string;
  @IsOptional() @IsHexColor() navbarTextColor?: string;
  @IsOptional() @IsHexColor() pageBgColor?: string;
  @IsOptional() @IsHexColor() cardBgColor?: string;
  @IsOptional() @IsHexColor() footerBgColor?: string;
  @IsOptional() @IsHexColor() footerTextColor?: string;
  /** Fondo del landing; se sube con POST /institution/hero o se enlaza por https. */
  @IsOptionalImageUrl() heroImageUrl?: string | null;
  /** @example "El respaldo financiero que necesitas." */
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) heroTitle?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) heroSubtitle?: string;
}

/** Campo multipart del logo (PNG o JPEG, máx. 5 MB). */
export class UploadLogoDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  logo: unknown;
}

/** Campo multipart para la imagen de fondo (PNG o JPEG, máx. 5 MB). */
export class UploadHeroDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  hero: unknown;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class InstitutionResponse extends UpdateInstitutionDto {
  /** Siempre 1 (configuración única). */
  id: number;
  /** Ruta pública del logo. @example "/uploads/institution/logo-3f1c.png" */
  logoUrl: string | null;
  updatedAt: Date;
}
