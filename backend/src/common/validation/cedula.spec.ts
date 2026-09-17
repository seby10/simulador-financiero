import { validateSync } from 'class-validator';
import { IsCedula, isValidCedula } from './cedula.js';

describe('isValidCedula', () => {
  it.each(['1710034065', '0926687856', '3050000003'])('acepta %s', (value) => {
    expect(isValidCedula(value)).toBe(true);
  });

  it.each([
    ['dígito verificador erróneo', '1710034066'],
    ['longitud', '171003406'],
    ['no numérica', '17100340a5'],
    ['provincia 00', '0010034065'],
    ['provincia 25', '2510034065'],
    ['tercer dígito >= 6', '1760034065'],
  ])('rechaza %s', (_, value) => {
    expect(isValidCedula(value)).toBe(false);
  });
});

describe('@IsCedula', () => {
  class Dto {
    @IsCedula() id: unknown;
  }
  const errorsFor = (id: unknown) =>
    validateSync(Object.assign(new Dto(), { id }));

  it('valida strings y rechaza otros tipos con mensaje en español', () => {
    expect(errorsFor('1710034065')).toHaveLength(0);
    expect(errorsFor(1710034065)[0].constraints).toEqual({
      isCedula: 'id debe ser una cédula ecuatoriana válida',
    });
  });
});
