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
  AmortizationMethod,
  AmortizationRow,
  AmortizationSummary,
  FeeAmount,
} from '../../common/math/financial-math.js';
import { FeeType } from '../../generated/prisma/enums.js';

export class CreateCreditTypeDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsDecimalString() minAmount: string;
  @IsDecimalString() maxAmount: string;
  @IsInt() @Min(1) @Max(600) minTermMonths: number;
  @IsInt() @Min(1) @Max(600) maxTermMonths: number;
  /** Tasa nominal anual en %. */
  @IsDecimalString(4, '16.0000') annualInterestRate: string;
}

export class UpdateCreditTypeDto extends PartialType(CreateCreditTypeDto) {}

export class CreateIndirectFeeDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @ApiProperty({ enum: FeeType, enumName: 'FeeType' })
  @IsEnum(FeeType)
  feeType: FeeType;
  /** USD si FIXED_PER_INSTALLMENT; % en los demás tipos. */
  @IsDecimalString(4, '0.0600') value: string;
  @IsBoolean() isMandatory: boolean;
}

export class UpdateIndirectFeeDto extends PartialType(CreateIndirectFeeDto) {}

export class SimulateCreditDto {
  @IsInt() creditTypeId: number;
  @IsDecimalString() amount: string;
  @IsInt() @Min(1) termMonths: number;
  @IsIn(['FRENCH', 'GERMAN']) method: AmortizationMethod;
  /** Cargos opcionales elegidos por el cliente; los obligatorios se aplican siempre. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  optionalFeeIds?: number[];
}

// ───────────── Respuestas (solo documentación OpenAPI) ─────────────
// Los Decimal de Prisma se serializan como string.

export class CreditTypeResponse {
  id: number;
  name: string;
  description: string | null;
  /** @example "500" */
  minAmount: string;
  /** @example "30000" */
  maxAmount: string;
  minTermMonths: number;
  maxTermMonths: number;
  /** Tasa nominal anual en %. @example "16" */
  annualInterestRate: string;
  createdAt: Date;
  updatedAt: Date;
}

export class IndirectFeeResponse {
  id: number;
  name: string;
  @ApiProperty({ enum: FeeType, enumName: 'FeeType' }) feeType: FeeType;
  /** USD si FIXED_PER_INSTALLMENT; % en los demás tipos. @example "0.06" */
  value: string;
  isMandatory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FeeAmountDto implements FeeAmount {
  /** @example "Seguro de Desgravamen" */
  name: string;
  /** @example "6.00" */
  amount: string;
}

export class AmortizationRowDto implements AmortizationRow {
  period: number;
  /** @example "10000.00" */
  openingBalance: string;
  /** @example "773.98" */
  principal: string;
  /** @example "133.33" */
  interest: string;
  /** Capital + interés. @example "907.31" */
  installment: string;
  fees: FeeAmountDto[];
  /** @example "7.50" */
  feesTotal: string;
  /** Cuota + cargos del período. @example "914.81" */
  totalPayment: string;
  /** @example "9226.02" */
  closingBalance: string;
}

export class AmortizationSummaryDto implements AmortizationSummary {
  method: AmortizationMethod;
  principal: string;
  termMonths: number;
  /** @example "16.0000" */
  nominalAnnualRatePct: string;
  /** @example "17.2271" */
  effectiveAnnualRatePct: string;
  firstPayment: string;
  lastPayment: string;
  totalPrincipal: string;
  totalInterest: string;
  totalPeriodicFees: string;
  /** Cargos de cobro único descontados del desembolso. */
  upfrontFees: FeeAmountDto[];
  totalUpfrontFees: string;
  /** Monto líquido recibido. */
  netDisbursement: string;
  /** Intereses + todos los cargos. */
  totalCreditCost: string;
  /** Capital + intereses + todos los cargos. */
  totalPaid: string;
}

export class CreditTypeRefDto {
  id: number;
  /** @example "Consumo" */
  name: string;
}

export class CreditSimulationResponse {
  creditType: CreditTypeRefDto;
  summary: AmortizationSummaryDto;
  schedule: AmortizationRowDto[];
}
