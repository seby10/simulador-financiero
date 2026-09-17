import { BadRequestException, Injectable } from '@nestjs/common';
import { assertMinMax, assertRange } from '../../common/http.js';
import { simulateInvestment } from '../../common/math/financial-math.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { InvestmentPlan } from '../../generated/prisma/client.js';
import {
  CreateInvestmentPlanDto,
  SimulateInvestmentDto,
  UpdateInvestmentPlanDto,
} from './investment.dto.js';

@Injectable()
export class InvestmentService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.investmentPlan.findMany({ orderBy: { id: 'asc' } });
  }

  getPlan(id: number) {
    return this.prisma.investmentPlan.findUniqueOrThrow({ where: { id } });
  }

  createPlan(dto: CreateInvestmentPlanDto) {
    assertPlanBounds(dto);
    return this.prisma.investmentPlan.create({ data: dto });
  }

  async updatePlan(id: number, dto: UpdateInvestmentPlanDto) {
    assertPlanBounds({ ...(await this.getPlan(id)), ...dto });
    return this.prisma.investmentPlan.update({ where: { id }, data: dto });
  }

  deletePlan(id: number) {
    return this.prisma.investmentPlan.delete({ where: { id } });
  }

  /** Valida monto, plazo y modalidad contra el plan. Reutilizado por onboarding. */
  async loadPlanFor(dto: SimulateInvestmentDto) {
    const plan = await this.getPlan(dto.planId);
    assertRange('amount', dto.amount, plan.minAmount, plan.maxAmount);
    assertRange('termDays', dto.termDays, plan.termMinDays, plan.termMaxDays);
    if (dto.payoutMethod === 'MONTHLY' && !plan.allowsMonthlyPayout) {
      throw new BadRequestException(
        'El plan no permite pago mensual de intereses',
      );
    }
    return plan;
  }

  async simulate(dto: SimulateInvestmentDto) {
    const plan = await this.loadPlanFor(dto);
    return {
      plan: { id: plan.id, name: plan.name },
      ...this.calculate(plan, dto),
    };
  }

  calculate(
    plan: InvestmentPlan,
    dto: Pick<SimulateInvestmentDto, 'amount' | 'termDays' | 'payoutMethod'>,
  ) {
    return simulateInvestment({
      amount: dto.amount,
      teaPct: plan.tea,
      termDays: dto.termDays,
      payoutMethod: dto.payoutMethod,
    });
  }
}

function assertPlanBounds(p: {
  minAmount: { toString(): string };
  maxAmount: { toString(): string };
  termMinDays: number;
  termMaxDays: number;
}) {
  assertMinMax('amount', p.minAmount, p.maxAmount);
  assertMinMax('termDays', p.termMinDays, p.termMaxDays);
}
