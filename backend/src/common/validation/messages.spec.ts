import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  Field,
  fieldLabel,
  fileKindList,
  validationExceptionFactory,
} from './messages.js';

/** Error de class-validator con lo mínimo que usa la fábrica. */
const error = (
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError => ({ property, constraints, children });

const messagesOf = (...errors: ValidationError[]) =>
  (validationExceptionFactory(errors).getResponse() as { message: string[] })
    .message;

describe('fieldLabel', () => {
  it('traduce un campo conocido', () => {
    expect(fieldLabel('termDays')).toBe('el plazo en días');
  });

  it('devuelve el nombre crudo si no está en el diccionario', () => {
    expect(fieldLabel('campoNuevo')).toBe('campoNuevo');
  });

  it('capitaliza para iniciar la frase', () => {
    expect(Field('amount')).toBe('El monto');
  });
});

describe('fileKindList', () => {
  it('sin extensiones', () => {
    expect(fileKindList([])).toBe('');
  });

  it('una sola extensión', () => {
    expect(fileKindList(['pdf'])).toBe('PDF');
  });

  it('dos extensiones', () => {
    expect(fileKindList(['png', 'jpg'])).toBe('PNG o JPG');
  });

  it('tres extensiones', () => {
    expect(fileKindList(['png', 'jpg', 'pdf'])).toBe('PNG, JPG o PDF');
  });
});

describe('validationExceptionFactory', () => {
  it('devuelve un BadRequest con la lista de mensajes', () => {
    const exception = validationExceptionFactory([
      error('email', { isEmail: 'email must be an email' }),
    ]);
    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
  });

  it.each([
    ['isDefined', 'x should be defined', 'Debes completar el monto'],
    ['isNotEmpty', 'x should not be empty', 'Debes completar el monto'],
    ['isString', 'x must be a string', 'El monto debe ser texto'],
    [
      'isInt',
      'x must be an integer number',
      'El monto debe ser un número entero',
    ],
    ['isNumber', 'x must be a number', 'El monto debe ser un número'],
    [
      'isBoolean',
      'x must be a boolean value',
      'El monto debe ser verdadero o falso',
    ],
    ['isArray', 'x must be an array', 'El monto debe ser una lista'],
    ['isEmail', 'x must be an email', 'El monto no tiene un formato válido'],
    ['isUuid', 'x must be a UUID', 'El monto no tiene un formato válido'],
    [
      'matches',
      'x must match /\\d/ regular expression',
      'El monto no tiene el formato correcto',
    ],
    [
      'arrayUnique',
      "All x's elements must be unique",
      'El monto no puede tener elementos repetidos',
    ],
    ['min', 'x must not be less than 1', 'El monto no puede ser menor que 1'],
    [
      'max',
      'x must not be greater than 10',
      'El monto no puede ser mayor que 10',
    ],
    [
      'minLength',
      'x must be longer than or equal to 8 characters',
      'El monto debe tener al menos 8 caracteres',
    ],
    [
      'maxLength',
      'x must be shorter than or equal to 100 characters',
      'El monto no puede superar los 100 caracteres',
    ],
    [
      'isEnum',
      'x must be one of the following values: A, B',
      'El monto debe ser uno de estos valores: A, B',
    ],
    [
      'isIn',
      'x must be one of the following values: A, B',
      'El monto debe ser uno de estos valores: A, B',
    ],
  ])('traduce %s', (key, original, expected) => {
    expect(messagesOf(error('amount', { [key]: original }))).toEqual([
      expected,
    ]);
  });

  it('nombra el campo rechazado por la lista blanca', () => {
    expect(
      messagesOf(
        error('sobra', {
          whitelistValidation: 'property sobra should not exist',
        }),
      ),
    ).toEqual(['No se reconoce el campo "sobra"']);
  });

  it('tolera un mensaje sin el parámetro numérico esperado', () => {
    expect(
      messagesOf(error('amount', { min: 'amount must not be less than' })),
    ).toEqual(['El monto no puede ser menor que ']);
  });

  it('tolera un enum sin la lista de valores', () => {
    expect(
      messagesOf(error('amount', { isEnum: 'amount must be one of these' })),
    ).toEqual(['El monto debe ser uno de estos valores: ']);
  });

  // El mensaje propio de `matches` es más útil que la plantilla genérica.
  it('respeta el mensaje propio de una regla que sí tiene plantilla', () => {
    expect(
      messagesOf(
        error('phone', { matches: 'phone debe tener entre 7 y 15 dígitos' }),
      ),
    ).toEqual(['El teléfono debe tener entre 7 y 15 dígitos']);
  });

  it('deja intacto un mensaje propio que no empieza con el campo', () => {
    expect(
      messagesOf(error('consent', { custom: 'Debes aceptar el tratamiento' })),
    ).toEqual(['Debes aceptar el tratamiento']);
  });

  it('aplana los errores anidados', () => {
    expect(
      messagesOf(
        error('frames', {}, [error('0', { isString: 'x must be a string' })]),
      ),
    ).toEqual(['0 debe ser texto']);
  });

  it('tolera un error sin constraints ni children', () => {
    expect(messagesOf({ property: 'amount' } as ValidationError)).toEqual([]);
  });
});
