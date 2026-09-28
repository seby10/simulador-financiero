import { D, money, round2, sum } from './decimal.util.js';
import {
  AmortizationResult,
  buildAmortizationSchedule,
  effectiveAnnualRatePct,
  frenchPayment,
  simpleInterest,
  simulateInvestment,
} from './financial-math.js';

/** Invariantes contables que toda tabla debe cumplir. */
function expectBalanced({ summary, schedule }: AmortizationResult) {
  expect(schedule.at(-1)!.closingBalance).toBe('0.00');
  expect(money(sum(schedule.map((r) => r.principal)))).toBe(summary.principal);
  expect(summary.totalPrincipal).toBe(summary.principal);
  schedule.forEach((row, idx) => {
    expect(row.period).toBe(idx + 1);
    expect(D(row.principal).gte(0)).toBe(true);
    expect(money(D(row.principal).plus(row.interest))).toBe(row.installment);
    expect(money(D(row.installment).plus(row.feesTotal))).toBe(
      row.totalPayment,
    );
    expect(money(sum(row.fees.map((f) => f.amount)))).toBe(row.feesTotal);
    expect(money(D(row.openingBalance).minus(row.principal))).toBe(
      row.closingBalance,
    );
    if (idx > 0)
      expect(row.openingBalance).toBe(schedule[idx - 1].closingBalance);
  });
  expect(money(sum(schedule.map((r) => r.interest)))).toBe(
    summary.totalInterest,
  );
}

describe('decimal.util', () => {
  it('evita el error IEEE-754 de 0.1 + 0.2', () => {
    expect(D(0.1).plus(0.2).toString()).toBe('0.3');
  });

  it('redondea ROUND_HALF_UP a 2 decimales', () => {
    expect(money('2.675')).toBe('2.68');
    expect(money('-2.675')).toBe('-2.68');
    expect(round2('1.004').toFixed(2)).toBe('1.00');
  });

  it('acepta objetos con toString (Prisma.Decimal)', () => {
    expect(money({ toString: () => '10.555' })).toBe('10.56');
    expect(sum([]).toString()).toBe('0');
  });
});

describe('frenchPayment', () => {
  it('calcula la cuota fija R = P·i(1+i)^n/((1+i)^n−1)', () => {
    expect(money(frenchPayment(10000, '0.01', 12))).toBe('888.49');
  });

  it('con tasa 0 divide el capital', () => {
    expect(money(frenchPayment(1200, 0, 12))).toBe('100.00');
  });

  it('rechaza períodos inválidos', () => {
    expect(() => frenchPayment(1000, '0.01', 0)).toThrow(RangeError);
    expect(() => frenchPayment(1000, '0.01', 1.5)).toThrow(RangeError);
  });
});

describe('effectiveAnnualRatePct', () => {
  it('convierte nominal 12 % mensual a efectiva 12.6825 %', () => {
    expect(effectiveAnnualRatePct(12).toFixed(4)).toBe('12.6825');
  });
});

describe('buildAmortizationSchedule — Sistema Francés', () => {
  it('genera cuota fija con cuadre exacto', () => {
    const result = buildAmortizationSchedule({
      principal: 10000,
      annualRatePct: 12,
      termMonths: 12,
      method: 'FRENCH',
    });
    expectBalanced(result);
    const [first] = result.schedule;
    expect(first).toMatchObject({
      openingBalance: '10000.00',
      interest: '100.00',
      principal: '788.49',
      installment: '888.49',
    });
    result.schedule
      .slice(0, -1)
      .forEach((r) => expect(r.installment).toBe('888.49'));
    // La última cuota absorbe el residuo de centavos.
    expect(result.schedule[11].installment).toBe('888.47');
    expect(result.summary.totalInterest).toBe('661.86');
    expect(result.summary.effectiveAnnualRatePct).toBe('12.6825');
    expect(result.summary.totalPaid).toBe('10661.86');
  });

  it('cuadra en hipotecario a 30 años (360 cuotas)', () => {
    const result = buildAmortizationSchedule({
      principal: '150000',
      annualRatePct: '9.5',
      termMonths: 360,
      method: 'FRENCH',
    });
    expectBalanced(result);
    expect(result.schedule[0].installment).toBe('1261.28');
  });

  it('con tasa 0 reparte el capital y ajusta la última cuota', () => {
    const result = buildAmortizationSchedule({
      principal: 1000,
      annualRatePct: 0,
      termMonths: 3,
      method: 'FRENCH',
    });
    expectBalanced(result);
    expect(result.schedule.map((r) => r.installment)).toEqual([
      '333.33',
      '333.33',
      '333.34',
    ]);
  });

  it('soporta plazo de una sola cuota', () => {
    const result = buildAmortizationSchedule({
      principal: 500,
      annualRatePct: 24,
      termMonths: 1,
      method: 'FRENCH',
    });
    expectBalanced(result);
    expect(result.schedule[0].installment).toBe('510.00');
  });
});

describe('buildAmortizationSchedule — Sistema Alemán', () => {
  it('amortización fija e interés decreciente', () => {
    const result = buildAmortizationSchedule({
      principal: 12000,
      annualRatePct: 12,
      termMonths: 12,
      method: 'GERMAN',
    });
    expectBalanced(result);
    result.schedule.forEach((r) => expect(r.principal).toBe('1000.00'));
    expect(result.schedule[0].installment).toBe('1120.00');
    expect(result.schedule[11].installment).toBe('1010.00');
    expect(result.summary.totalInterest).toBe('780.00');
    expect(result.summary.firstPayment).toBe('1120.00');
    expect(result.summary.lastPayment).toBe('1010.00');
  });

  it('ajusta centavos en la última amortización', () => {
    const result = buildAmortizationSchedule({
      principal: 10000,
      annualRatePct: 16,
      termMonths: 3,
      method: 'GERMAN',
    });
    expectBalanced(result);
    expect(result.schedule.map((r) => r.principal)).toEqual([
      '3333.33',
      '3333.33',
      '3333.34',
    ]);
  });
});

describe('buildAmortizationSchedule — cargos indirectos', () => {
  const fees = [
    {
      name: 'Seguro de Desgravamen',
      feeType: 'PERCENTAGE_REMAINING_BALANCE' as const,
      value: '0.06',
    },
    {
      name: 'Gastos Administrativos',
      feeType: 'FIXED_PER_INSTALLMENT' as const,
      value: '1.50',
    },
    {
      name: 'Solca',
      feeType: 'PERCENTAGE_INITIAL_AMOUNT' as const,
      value: '0.5',
    },
  ];

  it('desglosa cargos por período y cargos iniciales', () => {
    const result = buildAmortizationSchedule({
      principal: 12000,
      annualRatePct: 12,
      termMonths: 12,
      method: 'GERMAN',
      fees,
    });
    expectBalanced(result);
    const [first, second] = result.schedule;
    expect(first.fees).toEqual([
      { name: 'Seguro de Desgravamen', amount: '7.20' },
      { name: 'Gastos Administrativos', amount: '1.50' },
    ]);
    expect(first.feesTotal).toBe('8.70');
    expect(first.totalPayment).toBe('1128.70');
    expect(second.fees[0].amount).toBe('6.60');

    const { summary } = result;
    // Desgravamen: 0.0006 × 1000 × (12+11+…+1) = 46.80; administrativos: 18.00
    expect(summary.totalPeriodicFees).toBe('64.80');
    expect(summary.upfrontFees).toEqual([{ name: 'Solca', amount: '60.00' }]);
    expect(summary.totalUpfrontFees).toBe('60.00');
    expect(summary.netDisbursement).toBe('11940.00');
    expect(summary.totalCreditCost).toBe('904.80');
    expect(summary.totalPaid).toBe('12904.80');
    const periodicPaid = sum(result.schedule.map((r) => r.totalPayment));
    expect(money(periodicPaid.plus(summary.totalUpfrontFees))).toBe(
      summary.totalPaid,
    );
  });

  it('aplica los cuatro tipos de cargo, cada uno a su manera', () => {
    // 12 000 a 12 meses, alemán (amortización fija 1 000):
    const result = buildAmortizationSchedule({
      principal: 12000,
      annualRatePct: 12,
      termMonths: 12,
      method: 'GERMAN',
      fees: [
        ...fees, // desgravamen 0.06 % saldo, administrativos 1.50 fijos, Solca 0.5 % único
        {
          name: 'Seguro de auto',
          feeType: 'PERCENTAGE_INITIAL_INSTALLMENT' as const,
          value: '1',
        },
      ],
    });
    expectBalanced(result);
    const amounts = (period: number) =>
      Object.fromEntries(
        result.schedule[period - 1].fees.map((f) => [f.name, f.amount]),
      );
    // Fijo: igual siempre. Sobre saldo: baja. Repartido (120 / 12): igual siempre.
    expect(amounts(1)).toEqual({
      'Seguro de Desgravamen': '7.20',
      'Gastos Administrativos': '1.50',
      'Seguro de auto': '10.00',
    });
    expect(amounts(2)).toEqual({
      'Seguro de Desgravamen': '6.60',
      'Gastos Administrativos': '1.50',
      'Seguro de auto': '10.00',
    });
    // Único: no entra en ninguna cuota; se descuenta del desembolso.
    expect(
      result.schedule.every((r) => !r.fees.some((f) => f.name === 'Solca')),
    ).toBe(true);
    const { summary } = result;
    expect(summary.upfrontFees).toEqual([{ name: 'Solca', amount: '60.00' }]);
    expect(summary.netDisbursement).toBe('11940.00');
    // 46.80 desgravamen + 18.00 administrativos + 120.00 repartido
    expect(summary.totalPeriodicFees).toBe('184.80');
    const periodicPaid = sum(result.schedule.map((r) => r.totalPayment));
    expect(money(periodicPaid.plus(summary.totalUpfrontFees))).toBe(
      summary.totalPaid,
    );
  });

  it('reparte el % del monto y la última cuota absorbe los centavos', () => {
    // 5 % de 10 000 = 500.00 entre 7 cuotas: 71.43 × 6 + 71.42.
    const { schedule, summary } = buildAmortizationSchedule({
      principal: 10000,
      annualRatePct: 16,
      termMonths: 7,
      method: 'FRENCH',
      fees: [
        {
          name: 'Seguro de auto',
          feeType: 'PERCENTAGE_INITIAL_INSTALLMENT',
          value: '5',
        },
      ],
    });
    const shares = schedule.map((r) => r.fees[0].amount);
    expect(shares.slice(0, 6)).toEqual(Array(6).fill('71.43'));
    expect(shares[6]).toBe('71.42');
    expect(money(sum(shares))).toBe('500.00');
    // Repartido no toca el desembolso.
    expect(summary.netDisbursement).toBe('10000.00');
  });

  it('valida entradas', () => {
    const base = {
      principal: 1000,
      annualRatePct: 10,
      termMonths: 12,
      method: 'FRENCH' as const,
    };
    expect(() => buildAmortizationSchedule({ ...base, principal: 0 })).toThrow(
      'monto',
    );
    expect(() =>
      buildAmortizationSchedule({ ...base, annualRatePct: -1 }),
    ).toThrow('tasa');
    expect(() => buildAmortizationSchedule({ ...base, termMonths: 0 })).toThrow(
      'termMonths',
    );
  });
});

describe('simulateInvestment', () => {
  it('interés bruto con base 360 y retención al vencimiento', () => {
    expect(money(simpleInterest(10000, 8, 180))).toBe('400.00');
    const result = simulateInvestment({
      amount: 10000,
      teaPct: 8,
      termDays: 180,
      payoutMethod: 'AT_MATURITY',
    });
    expect(result).toMatchObject({
      grossInterest: '400.00',
      withholdingRatePct: '2.00',
      withholding: '8.00',
      netInterest: '392.00',
      monthlyPayment: null,
      totalToReceive: '10392.00',
    });
    expect(result.payoutSchedule).toEqual([
      {
        period: 1,
        day: 180,
        grossInterest: '400.00',
        withholding: '8.00',
        netInterest: '392.00',
        capitalReturned: '10000.00',
        totalPayment: '10392.00',
      },
    ]);
  });

  it('plazo >= 360 días está exento de retención', () => {
    const result = simulateInvestment({
      amount: 10000,
      teaPct: 8,
      termDays: 360,
      payoutMethod: 'AT_MATURITY',
    });
    expect(result.withholding).toBe('0.00');
    expect(result.totalToReceive).toBe('10800.00');
  });

  it('permite forzar la tasa de retención', () => {
    const result = simulateInvestment({
      amount: 10000,
      teaPct: 8,
      termDays: 360,
      payoutMethod: 'AT_MATURITY',
      withholdingRatePct: 1,
    });
    expect(result.withholding).toBe('8.00');
  });

  it('pago mensual: paga en cada frontera de 30 días y liquida el remanente', () => {
    const result = simulateInvestment({
      amount: 10000,
      teaPct: '9.5',
      termDays: 95,
      payoutMethod: 'MONTHLY',
    });
    expect(result.grossInterest).toBe('250.69');
    expect(result.payoutSchedule.map((r) => [r.day, r.grossInterest])).toEqual([
      [30, '79.17'],
      [60, '79.17'],
      [90, '79.17'],
      [95, '13.18'],
    ]);
    expect(result.monthlyPayment).toBe('77.59');
    expect(money(sum(result.payoutSchedule.map((r) => r.grossInterest)))).toBe(
      result.grossInterest,
    );
    expect(money(sum(result.payoutSchedule.map((r) => r.withholding)))).toBe(
      result.withholding,
    );
    const received = sum(result.payoutSchedule.map((r) => r.totalPayment));
    expect(money(received)).toBe(result.totalToReceive);
    expect(result.payoutSchedule.at(-1)!.capitalReturned).toBe('10000.00');
  });

  it.each([
    [30, [[30, '79.17']]],
    [
      31,
      [
        [30, '79.17'],
        [31, '2.64'],
      ],
    ],
    [
      60,
      [
        [30, '79.17'],
        [60, '79.16'],
      ],
    ],
  ])('pago mensual a %i días', (termDays, expected) => {
    const result = simulateInvestment({
      amount: 10000,
      teaPct: '9.5',
      termDays,
      payoutMethod: 'MONTHLY',
    });
    expect(result.payoutSchedule.map((r) => [r.day, r.grossInterest])).toEqual(
      expected,
    );
  });

  it('nunca genera pagos negativos con montos mínimos', () => {
    const result = simulateInvestment({
      amount: '0.60',
      teaPct: 1,
      termDays: 330,
      payoutMethod: 'MONTHLY',
    });
    result.payoutSchedule.forEach((r) => {
      expect(D(r.grossInterest).gte(0)).toBe(true);
      expect(D(r.netInterest).gte(0)).toBe(true);
    });
    expect(money(sum(result.payoutSchedule.map((r) => r.grossInterest)))).toBe(
      result.grossInterest,
    );
  });

  it('valida entradas', () => {
    const base = {
      amount: 1000,
      teaPct: 8,
      termDays: 90,
      payoutMethod: 'AT_MATURITY' as const,
    };
    expect(() => simulateInvestment({ ...base, amount: -5 })).toThrow('monto');
    expect(() => simulateInvestment({ ...base, termDays: 0 })).toThrow(
      'termDays',
    );
    expect(() =>
      simulateInvestment({ ...base, termDays: 29, payoutMethod: 'MONTHLY' }),
    ).toThrow('30');
  });
});
