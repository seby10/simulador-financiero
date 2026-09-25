import type { ThrottlerModuleOptions } from '@nestjs/throttler';

const MINUTE = 60_000;

/**
 * Límite general por IP: holgado para la navegación normal, corta un script que
 * recorra la API. Las pruebas (NODE_ENV=test, lo fija vitest) no se limitan.
 */
export const throttlerOptions: ThrottlerModuleOptions = {
  throttlers: [{ name: 'default', ttl: MINUTE, limit: 300 }],
  skipIf: () => process.env.NODE_ENV === 'test',
  errorMessage:
    'Demasiadas solicitudes en poco tiempo. Espera un momento e intenta de nuevo.',
};

/**
 * Rutas que adivinan secretos o gastan cómputo caro (login, registro, biometría):
 * 10 por minuto y por IP. Se aplica con `@Throttle(STRICT)`.
 */
export const STRICT = { default: { ttl: MINUTE, limit: 10 } };
