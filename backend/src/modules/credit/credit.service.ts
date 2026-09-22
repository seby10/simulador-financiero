import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { assertFileKind, assertMinMax, assertRange, PUBLIC_UPLOADS, saveFile } from '../../common/http.js';
import { buildAmortizationSchedule } from '../../common/math/financial-math.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  CreateCreditTypeDto,
  CreateIndirectFeeDto,
  SimulateCreditDto,
  UpdateCreditTypeDto,
  UpdateIndirectFeeDto,
} from './credit.dto.js';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tipos de crédito ──
  listTypes() {
    return this.prisma.creditType.findMany({ orderBy: { id: 'asc' } });
  }

  getType(id: number) {
    return this.prisma.creditType.findUniqueOrThrow({ where: { id } });
  }

  createType(dto: CreateCreditTypeDto) {
    assertTypeBounds(dto);
    return this.prisma.creditType.create({ data: dto });
  }

  async updateType(id: number, dto: UpdateCreditTypeDto) {
    assertTypeBounds({ ...(await this.getType(id)), ...dto });
    return this.prisma.creditType.update({ where: { id }, data: dto });
  }

  deleteType(id: number) {
    return this.prisma.creditType.delete({ where: { id } });
  }

  async updateImage(id: number, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Adjunte la imagen');
    await this.getType(id);
    const kind = assertFileKind(file.buffer, ['png', 'jpg'], 'image');
    const name = `credit-${id}-${randomUUID()}.${kind}`;
    await saveFile(join(PUBLIC_UPLOADS, 'credit', name), file.buffer);
    return this.prisma.creditType.update({
      where: { id },
      data: { imageUrl: `/uploads/credit/${name}` },
    });
  }

  // ── Cargos indirectos ──
  listFees() {
    return this.prisma.indirectFee.findMany({ orderBy: { id: 'asc' } });
  }

  getFee(id: number) {
    return this.prisma.indirectFee.findUniqueOrThrow({ where: { id } });
  }

  createFee(dto: CreateIndirectFeeDto) {
    return this.prisma.indirectFee.create({ data: dto });
  }

  updateFee(id: number, dto: UpdateIndirectFeeDto) {
    return this.prisma.indirectFee.update({ where: { id }, data: dto });
  }

  deleteFee(id: number) {
    return this.prisma.indirectFee.delete({ where: { id } });
  }

  // ── Simulación ──
  async simulate(dto: SimulateCreditDto) {
    const creditType = await this.getType(dto.creditTypeId);
    assertRange(
      'amount',
      dto.amount,
      creditType.minAmount,
      creditType.maxAmount,
    );
    assertRange(
      'termMonths',
      dto.termMonths,
      creditType.minTermMonths,
      creditType.maxTermMonths,
    );

    const optionalIds = dto.optionalFeeIds ?? [];
    const fees = await this.prisma.indirectFee.findMany({
      where: { OR: [{ isMandatory: true }, { id: { in: optionalIds } }] },
      orderBy: { id: 'asc' },
    });
    const missing = optionalIds.filter((id) => !fees.some((f) => f.id === id));
    if (missing.length) {
      throw new BadRequestException(
        `Cargos inexistentes: ${missing.join(', ')}`,
      );
    }

    return {
      creditType: { id: creditType.id, name: creditType.name },
      ...buildAmortizationSchedule({
        principal: dto.amount,
        annualRatePct: creditType.annualInterestRate,
        termMonths: dto.termMonths,
        method: dto.method,
        fees,
      }),
    };
  }
}

function assertTypeBounds(t: {
  minAmount: { toString(): string };
  maxAmount: { toString(): string };
  minTermMonths: number;
  maxTermMonths: number;
}) {
  assertMinMax('amount', t.minAmount, t.maxAmount);
  assertMinMax('termMonths', t.minTermMonths, t.maxTermMonths);
}
