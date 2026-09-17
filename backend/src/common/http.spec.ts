import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { assertMinMax, IsDecimalString } from './http.js';

class RateDto {
  // Espejo de Decimal(7, 4)
  @IsDecimalString({ decimals: 4, integerDigits: 3 }) rate: string;
}

const isValid = (rate: unknown) =>
  validateSync(plainToInstance(RateDto, { rate })).length === 0;

describe('IsDecimalString', () => {
  it.each(['16', '16.5', '999.9999', 21])('acepta %j', (rate) => {
    expect(isValid(rate)).toBe(true);
  });

  it.each(['1000', '1.12345', '-1', '1e3', '', 0.1 + 0.2])(
    'rechaza %j (fuera de la precisión de la columna)',
    (rate) => {
      expect(isValid(rate)).toBe(false);
    },
  );
});

describe('assertMinMax', () => {
  it('exige mínimo positivo y min <= max', () => {
    expect(() => assertMinMax('amount', '0', '10')).toThrow('mayor a 0');
    expect(() => assertMinMax('amount', '20', '10')).toThrow(
      'no puede superar',
    );
    expect(() => assertMinMax('amount', '1', '10')).not.toThrow();
  });
});
