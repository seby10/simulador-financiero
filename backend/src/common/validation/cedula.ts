import { ValidateBy } from 'class-validator';

/** Cédula ecuatoriana: provincia 01-24 (o 30), tercer dígito < 6, dígito verificador módulo 10. */
export function isValidCedula(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const digits = value.split('').map(Number);
  const province = digits[0] * 10 + digits[1];
  if (!((province >= 1 && province <= 24) || province === 30) || digits[2] >= 6)
    return false;
  const total = digits.slice(0, 9).reduce((acc, d, idx) => {
    const product = idx % 2 === 0 ? d * 2 : d;
    return acc + (product > 9 ? product - 9 : product);
  }, 0);
  return (10 - (total % 10)) % 10 === digits[9];
}

export const IsCedula = () =>
  ValidateBy({
    name: 'isCedula',
    validator: {
      validate: (value) => typeof value === 'string' && isValidCedula(value),
      defaultMessage: () => '$property no es una cédula ecuatoriana válida',
    },
  });
