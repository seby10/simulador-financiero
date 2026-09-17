import { Decimal } from 'decimal.js';

// Configuración global única. Importar Decimal SIEMPRE desde este archivo.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Acepta number/string/Decimal y también Prisma.Decimal (otra copia de decimal.js). */
export type DecimalInput = Decimal.Value | { toString(): string };

export const D = (value: DecimalInput): Decimal =>
  value instanceof Decimal ||
  typeof value === 'string' ||
  typeof value === 'number'
    ? new Decimal(value)
    : new Decimal(value.toString());

export const round2 = (value: DecimalInput): Decimal =>
  D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** Serialización monetaria: siempre string con 2 decimales. */
export const money = (value: DecimalInput): string => round2(value).toFixed(2);

export const sum = (values: DecimalInput[]): Decimal =>
  values.reduce<Decimal>((acc, v) => acc.plus(D(v)), new Decimal(0));
