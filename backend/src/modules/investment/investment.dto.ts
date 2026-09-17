import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDecimalString } from '../../common/http.js';
import type {
  InvestmentResult,
  PayoutRow,
} from '../../common/math/financial-math.js';
import { PayoutMethod } from '../../generated/prisma/enums.js';

/** Documentos que el onboarding sabe recibir (campos multipart). */
export const DOCUMENT_KINDS = ['idFront', 'idBack', 'utilityBill'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export class CreateInvestmentPlanDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsDecimalString() minAmount: string;
  @IsDecimalString() maxAmount: string;
  @IsInt() @Min(1) @Max(3650) termMinDays: number;
  @IsInt() @Min(1) @Max(3650) termMaxDays: number;
  /** Tasa Efectiva Anual en %. */
  @IsDecimalString({ decimals: 4, integerDigits: 3, example: '8.5000' })
  tea: string;
  @IsBoolean() allowsMonthlyPayout: boolean;
  /**
   * Documentos exigidos antes de la biometría (campos de carga multipart).
   */
  @ApiProperty({
    required: false,
    isArray: true,
    enum: DOCUMENT_KINDS,
    example: DOCUMENT_KINDS,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(DOCUMENT_KINDS, { each: true })
  requiredDocuments?: DocumentKind[];
}

export class UpdateInvestmentPlanDto extends PartialType(
  CreateInvestmentPlanDto,
) {}

export class SimulateInvestmentDto {
  @IsInt() planId: number;
  @IsDecimalString() amount: string;
  /** @example 270 */
  @IsInt() @Min(1) termDays: number;
  @ApiProperty({ enum: PayoutMethod, enumName: 'PayoutMethod' })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod;
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────

export class InvestmentPlanResponse {
  id: number;
  /** @example "Póliza Rendimiento" */
  name: string;
  /** @example "1000" */
  minAmount: string;
  /** @example "1000000" */
  maxAmount: string;
  termMinDays: number;
  termMaxDays: number;
  /** Tasa Efectiva Anual en %. @example "8.5" */
  tea: string;
  allowsMonthlyPayout: boolean;
  @ApiProperty({ isArray: true, enum: DOCUMENT_KINDS })
  requiredDocuments: DocumentKind[];
  createdAt: Date;
  updatedAt: Date;
}

export class PayoutRowDto implements PayoutRow {
  period: number;
  /** Día del plazo en que se realiza el pago. */
  day: number;
  /** @example "177.08" */
  grossInterest: string;
  /** @example "3.54" */
  withholding: string;
  /** @example "173.54" */
  netInterest: string;
  /** @example "0.00" */
  capitalReturned: string;
  /** @example "173.54" */
  totalPayment: string;
}

export class InvestmentPlanRefDto {
  id: number;
  name: string;
}

export class InvestmentSimulationResponse implements InvestmentResult {
  plan: InvestmentPlanRefDto;
  /** @example "25000.00" */
  amount: string;
  /** @example "8.5000" */
  teaPct: string;
  termDays: number;
  @ApiProperty({ enum: PayoutMethod, enumName: 'PayoutMethod' })
  payoutMethod: PayoutMethod;
  /** Capital × TEA/360 × días. @example "1593.75" */
  grossInterest: string;
  /** @example "2.00" */
  withholdingRatePct: string;
  /** @example "31.86" */
  withholding: string;
  /** @example "1561.89" */
  netInterest: string;
  /** Pago neto mensual (solo modalidad MONTHLY). @example "173.54" */
  monthlyPayment: string | null;
  /** @example "26561.89" */
  totalToReceive: string;
  payoutSchedule: PayoutRowDto[];
}
