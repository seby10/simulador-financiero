import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDecimalString } from '../../common/http.js';
import { IsCedula } from '../../common/validation/cedula.js';
import {
  ApplicationStatus,
  BiometricStatus,
  PayoutMethod,
} from '../../generated/prisma/enums.js';

export class ApplyDto {
  /** @example "María José Andrade" */
  @IsString() @IsNotEmpty() @MaxLength(200) applicantFullName: string;
  /** Cédula ecuatoriana (10 dígitos, verificador módulo 10). @example "1710034065" */
  @IsCedula() applicantIdNumber: string;
  /** @example "maria.andrade@example.com" */
  @IsEmail() email: string;
  /** @example "0991234567" */
  @Matches(/^\+?\d{7,15}$/, {
    message: 'phone debe tener entre 7 y 15 dígitos',
  })
  phone: string;
  /** @example "Ahorros de relación de dependencia" */
  @IsString() @IsNotEmpty() @MaxLength(500) sourceOfFunds: string;
  @IsInt() investmentPlanId: number;
  @IsDecimalString() amount: string;
  /** @example 270 */
  @IsInt() @Min(1) termDays: number;
  @ApiProperty({ enum: PayoutMethod, enumName: 'PayoutMethod' })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod;
}

export class ListApplicationsQuery {
  @ApiProperty({
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
    required: false,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}

/** Campos multipart de carga de documentos (máx. 5 MB c/u). */
export class UploadDocumentsDto {
  /** Solo JPEG o PNG: es la referencia de la verificación facial. */
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  idFront?: unknown;
  /** JPEG, PNG o PDF. */
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  idBack?: unknown;
  /** JPEG, PNG o PDF. */
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  utilityBill?: unknown;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class ApplicationPlanRefDto {
  id: number;
  name: string;
  /** @example "8.5" */
  tea: string;
}

export class InvestmentApplicationResponse {
  /** @example "ce64e373-f776-4b61-8bf0-78a19bb86da4" */
  id: string;
  /** Cuenta que creó la solicitud. */
  userId: string | null;
  applicantFullName: string;
  applicantIdNumber: string;
  email: string;
  phone: string;
  sourceOfFunds: string;
  investmentPlanId: number;
  /** @example "15000" */
  amount: string;
  termDays: number;
  @ApiProperty({ enum: PayoutMethod, enumName: 'PayoutMethod' })
  payoutMethod: PayoutMethod;
  @ApiProperty({ enum: ApplicationStatus, enumName: 'ApplicationStatus' })
  status: ApplicationStatus;
  @ApiProperty({ enum: BiometricStatus, enumName: 'BiometricStatus' })
  biometricStatus: BiometricStatus;
  /** Coincidencia facial del intento que verificó la identidad. @example "95.07" */
  biometricScore: string | null;
  /** Tipo de documento → URL de descarga (requiere credencial de administrador). */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      idFront:
        '/api/onboarding/applications/ce64e373-f776-4b61-8bf0-78a19bb86da4/documents/idFront',
    },
  })
  documentUrls: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export class InvestmentApplicationWithPlanResponse extends InvestmentApplicationResponse {
  investmentPlan: ApplicationPlanRefDto;
}
