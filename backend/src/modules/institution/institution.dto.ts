import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateInstitutionDto {
  /** @example "Cooperativa de Ahorro y Crédito Andina" */
  @IsString() @IsNotEmpty() @MaxLength(200) institutionName: string;
  /** @example "1790000000001" */
  @Matches(/^\d{13}$/, { message: 'ruc debe tener 13 dígitos' }) ruc: string;
  @IsString() @IsNotEmpty() @MaxLength(200) legalRepresentative: string;
  @IsString() @IsNotEmpty() @MaxLength(300) address: string;
  /** @example "+593 2 250 0000" */
  @Matches(/^\+?[\d\s-]{7,20}$/, { message: 'phone no es válido' })
  phone: string;
  @IsEmail() email: string;
  /** Texto legal impreso en los PDF. */
  @IsString() @IsNotEmpty() @MaxLength(2000) disclaimerText: string;
  @IsString() @IsNotEmpty() @MaxLength(7) primaryColor: string;
  @IsString() @IsNotEmpty() @MaxLength(7) secondaryColor: string;
  @IsOptional() @IsString() @MaxLength(7) accentColor?: string;
  @IsOptional() @IsString() @MaxLength(7) navbarBgColor?: string;
  @IsOptional() @IsString() @MaxLength(7) navbarTextColor?: string;
  @IsOptional() @IsString() @MaxLength(7) pageBgColor?: string;
  @IsOptional() @IsString() @MaxLength(7) cardBgColor?: string;
  @IsOptional() @IsString() @MaxLength(7) footerBgColor?: string;
  @IsOptional() @IsString() @MaxLength(7) footerTextColor?: string;
  @IsOptional() @IsString() heroImageUrl?: string;
  @IsString() @IsNotEmpty() @MaxLength(100) heroTitle: string;
  @IsString() @IsNotEmpty() @MaxLength(300) heroSubtitle: string;
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
