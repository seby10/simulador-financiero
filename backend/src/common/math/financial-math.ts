import {
  D,
  Decimal,
  DecimalInput,
  money,
  round2,
  sum,
} from './decimal.util.js';

// Tipos espejo de los enums de Prisma: el motor es puro y no depende de la BD.
export type AmortizationMethod = 'FRENCH' | 'GERMAN';
export type FeeType =
  | 'FIXED_PER_INSTALLMENT'
  | 'PERCENTAGE_REMAINING_BALANCE'
  | 'PERCENTAGE_INITIAL_AMOUNT';
export type PayoutMethod = 'AT_MATURITY' | 'MONTHLY';

export interface FeeInput {
  name: string;
  feeType: FeeType;
  /** USD para FIXED_PER_INSTALLMENT; porcentaje (0.06 = 0.06 %) en los demás. */
  value: DecimalInput;
}

export interface CreditScheduleInput {
  principal: DecimalInput;
  /** Tasa nominal anual en porcentaje (16 = 16 %), capitalización mensual. */
  annualRatePct: DecimalInput;
  termMonths: number;
  method: AmortizationMethod;
  fees?: FeeInput[];
}

export interface FeeAmount {
  name: string;
  amount: string;
}

export interface AmortizationRow {
  period: number;
  openingBalance: string;
  principal: string;
  interest: string;
  /** Capital + interés. */
  installment: string;
  fees: FeeAmount[];
  feesTotal: string;
  /** Cuota + cargos indirectos del período. */
  totalPayment: string;
  closingBalance: string;
}

export interface AmortizationSummary {
  method: AmortizationMethod;
  principal: string;
  termMonths: number;
  nominalAnnualRatePct: string;
  effectiveAnnualRatePct: string;
  firstPayment: string;
  lastPayment: string;
  totalPrincipal: string;
  totalInterest: string;
  totalPeriodicFees: string;
  upfrontFees: FeeAmount[];
  totalUpfrontFees: string;
  /** Monto líquido recibido tras descontar cargos sobre el monto inicial. */
  netDisbursement: string;
  /** Intereses + todos los cargos indirectos. */
  totalCreditCost: string;
  /** Suma de pagos periódicos + cargos iniciales. */
  totalPaid: string;
}

export interface AmortizationResult {
  summary: AmortizationSummary;
  schedule: AmortizationRow[];
}

const pct = (value: DecimalInput) => D(value).div(100);

function assertPositiveInt(value: number, field: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${field} debe ser un entero >= 1`);
  }
}

function assertAmounts(principal: Decimal, rate: Decimal) {
  if (!principal.isFinite() || principal.lte(0)) {
    throw new RangeError('El monto debe ser mayor a 0');
  }
  if (!rate.isFinite() || rate.lt(0)) {
    throw new RangeError('La tasa no puede ser negativa');
  }
}

/** R = P · i(1+i)^n / ((1+i)^n − 1), sin redondear. Con i = 0 → P/n. */
export function frenchPayment(
  principal: DecimalInput,
  periodicRate: DecimalInput,
  periods: number,
): Decimal {
  const p = D(principal);
  const i = D(periodicRate);
  assertPositiveInt(periods, 'periods');
  if (i.isZero()) return p.div(periods);
  const factor = i.plus(1).pow(periods);
  return p.times(i).times(factor).div(factor.minus(1));
}

/** Tasa efectiva anual (%) desde nominal anual (%) con capitalización mensual. */
export function effectiveAnnualRatePct(
  nominalAnnualRatePct: DecimalInput,
): Decimal {
  return pct(nominalAnnualRatePct).div(12).plus(1).pow(12).minus(1).times(100);
}

export function buildAmortizationSchedule(
  input: CreditScheduleInput,
): AmortizationResult {
  const principal = round2(input.principal);
  const annualRate = D(input.annualRatePct);
  const n = input.termMonths;
  assertAmounts(principal, annualRate);
  assertPositiveInt(n, 'termMonths');

  const i = pct(annualRate).div(12);
  const fees = input.fees ?? [];
  const periodicFees = fees.filter(
    (f) => f.feeType !== 'PERCENTAGE_INITIAL_AMOUNT',
  );
  const upfrontFees = fees
    .filter((f) => f.feeType === 'PERCENTAGE_INITIAL_AMOUNT')
    .map((f) => ({
      name: f.name,
      amount: round2(principal.times(pct(f.value))),
    }));

  // Francés: cuota fija redondeada. Alemán: amortización fija redondeada.
  const fixedPayment = round2(frenchPayment(principal, i, n));
  const fixedPrincipal = round2(principal.div(n));

  const schedule: AmortizationRow[] = [];
  const totals = {
    principal: [] as Decimal[],
    interest: [] as Decimal[],
    fees: [] as Decimal[],
  };
  let balance = principal;

  for (let period = 1; period <= n; period++) {
    const interest = round2(balance.times(i));
    // La última cuota absorbe los centavos residuales → saldo final exacto 0.00.
    const principalPart =
      period === n
        ? balance
        : Decimal.min(
            balance,
            input.method === 'FRENCH'
              ? fixedPayment.minus(interest)
              : fixedPrincipal,
          );

    const rowFees = periodicFees.map((f) => ({
      name: f.name,
      amount: round2(
        f.feeType === 'FIXED_PER_INSTALLMENT'
          ? f.value
          : balance.times(pct(f.value)),
      ),
    }));
    const feesTotal = sum(rowFees.map((f) => f.amount));
    const installment = principalPart.plus(interest);
    const closing = balance.minus(principalPart);

    schedule.push({
      period,
      openingBalance: money(balance),
      principal: money(principalPart),
      interest: money(interest),
      installment: money(installment),
      fees: rowFees.map((f) => ({ name: f.name, amount: money(f.amount) })),
      feesTotal: money(feesTotal),
      totalPayment: money(installment.plus(feesTotal)),
      closingBalance: money(closing),
    });

    totals.principal.push(principalPart);
    totals.interest.push(interest);
    totals.fees.push(feesTotal);
    balance = closing;
  }

  const totalInterest = sum(totals.interest);
  const totalPeriodicFees = sum(totals.fees);
  const totalUpfrontFees = sum(upfrontFees.map((f) => f.amount));
  const totalFees = totalPeriodicFees.plus(totalUpfrontFees);

  return {
    summary: {
      method: input.method,
      principal: money(principal),
      termMonths: n,
      nominalAnnualRatePct: annualRate.toFixed(4),
      effectiveAnnualRatePct: effectiveAnnualRatePct(annualRate).toFixed(4),
      firstPayment: schedule[0].totalPayment,
      lastPayment: schedule[n - 1].totalPayment,
      totalPrincipal: money(sum(totals.principal)),
      totalInterest: money(totalInterest),
      totalPeriodicFees: money(totalPeriodicFees),
      upfrontFees: upfrontFees.map((f) => ({
        name: f.name,
        amount: money(f.amount),
      })),
      totalUpfrontFees: money(totalUpfrontFees),
      netDisbursement: money(principal.minus(totalUpfrontFees)),
      totalCreditCost: money(totalInterest.plus(totalFees)),
      totalPaid: money(principal.plus(totalInterest).plus(totalFees)),
    },
    schedule,
  };
}

// ───────────────────────── Pólizas a plazo fijo ─────────────────────────

export const COMMERCIAL_YEAR_DAYS = 360;
export const PAYOUT_PERIOD_DAYS = 30;
// ponytail: regla SRI simplificada (retención 2 %, exenta a plazo >= 360 días);
// mover a InvestmentPlan si la institución necesita otra política.
export const WITHHOLDING_RATE_PCT = 2;
export const WITHHOLDING_EXEMPT_DAYS = 360;

export interface InvestmentInput {
  amount: DecimalInput;
  /** Tasa Efectiva Anual en porcentaje. */
  teaPct: DecimalInput;
  termDays: number;
  payoutMethod: PayoutMethod;
  /** Por defecto aplica la regla SRI simplificada. */
  withholdingRatePct?: DecimalInput;
}

export interface PayoutRow {
  period: number;
  day: number;
  grossInterest: string;
  withholding: string;
  netInterest: string;
  capitalReturned: string;
  totalPayment: string;
}

export interface InvestmentResult {
  amount: string;
  teaPct: string;
  termDays: number;
  payoutMethod: PayoutMethod;
  grossInterest: string;
  withholdingRatePct: string;
  withholding: string;
  netInterest: string;
  /** Pago neto mensual (primer período) si la modalidad es MONTHLY. */
  monthlyPayment: string | null;
  totalToReceive: string;
  payoutSchedule: PayoutRow[];
}

/** Interés bruto = Capital × (TEA / 360) × Días. */
export function simpleInterest(
  amount: DecimalInput,
  teaPct: DecimalInput,
  days: number,
): Decimal {
  return D(amount).times(pct(teaPct)).div(COMMERCIAL_YEAR_DAYS).times(days);
}

export function simulateInvestment(input: InvestmentInput): InvestmentResult {
  const amount = round2(input.amount);
  const tea = D(input.teaPct);
  const days = input.termDays;
  assertAmounts(amount, tea);
  assertPositiveInt(days, 'termDays');
  if (input.payoutMethod === 'MONTHLY' && days < PAYOUT_PERIOD_DAYS) {
    throw new RangeError(
      `El pago mensual requiere un plazo >= ${PAYOUT_PERIOD_DAYS} días`,
    );
  }

  const withholdingRate = D(
    input.withholdingRatePct ??
      (days >= WITHHOLDING_EXEMPT_DAYS ? 0 : WITHHOLDING_RATE_PCT),
  );
  const grossInterest = round2(simpleInterest(amount, tea, days));

  // Un pago en cada frontera de 30 días y la liquidación final al vencimiento.
  const payouts =
    input.payoutMethod === 'MONTHLY' ? Math.ceil(days / PAYOUT_PERIOD_DAYS) : 1;
  const periodGross = round2(simpleInterest(amount, tea, PAYOUT_PERIOD_DAYS));

  const payoutSchedule: PayoutRow[] = [];
  const withholdings: Decimal[] = [];
  let pendingGross = grossInterest;
  for (let period = 1; period <= payouts; period++) {
    const isLast = period === payouts;
    // El último pago cubre los días desde la última frontera y absorbe los centavos residuales.
    const gross = isLast
      ? pendingGross
      : Decimal.min(periodGross, pendingGross);
    // La retención se aplica sobre cada pago de intereses.
    const wh = round2(gross.times(pct(withholdingRate)));
    const capital = isLast ? amount : new Decimal(0);
    pendingGross = pendingGross.minus(gross);
    withholdings.push(wh);
    payoutSchedule.push({
      period,
      day: isLast ? days : period * PAYOUT_PERIOD_DAYS,
      grossInterest: money(gross),
      withholding: money(wh),
      netInterest: money(gross.minus(wh)),
      capitalReturned: money(capital),
      totalPayment: money(gross.minus(wh).plus(capital)),
    });
  }

  const withholding = sum(withholdings);
  const netInterest = grossInterest.minus(withholding);

  return {
    amount: money(amount),
    teaPct: tea.toFixed(4),
    termDays: days,
    payoutMethod: input.payoutMethod,
    grossInterest: money(grossInterest),
    withholdingRatePct: withholdingRate.toFixed(2),
    withholding: money(withholding),
    netInterest: money(netInterest),
    monthlyPayment:
      input.payoutMethod === 'MONTHLY' ? payoutSchedule[0].netInterest : null,
    totalToReceive: money(amount.plus(netInterest)),
    payoutSchedule,
  };
}
