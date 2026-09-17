import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { promisify } from 'node:util';

/**
 * scrypt con los parámetros recomendados por OWASP (N=2^16, r=8, p=1 → 64 MiB
 * por derivación). `node:crypto` lo trae de fábrica, así que no hace falta una
 * dependencia nativa como argon2/bcrypt.
 */
const COST = 2 ** 16;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
/** scrypt necesita 128·N·r bytes; el tope por defecto de Node (32 MiB) se queda corto. */
const maxmem = (cost: number, blockSize: number) => 256 * cost * blockSize;

// `scrypt` avisa de parámetros inválidos lanzando en el acto; promisify lo
// convierte en un rechazo, así que quien llame solo tiene que esperar la promesa.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const derive = (
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelization: number,
) =>
  scryptAsync(
    // NFKC: dos formas Unicode de la misma contraseña deben dar el mismo hash.
    password.normalize('NFKC'),
    salt,
    KEY_BYTES,
    {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: maxmem(cost, blockSize),
    },
  );

/**
 * Formato `scrypt$N$r$p$salt$hash` (salt y hash en base64). Los parámetros viajan
 * con el hash: se pueden endurecer más adelante sin invalidar las contraseñas ya
 * guardadas.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELIZATION);
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/** Nunca lanza: un hash corrupto o de otro esquema simplemente no coincide. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;
  const [scheme, cost, blockSize, parallelization, salt, expected] = parts;
  if (scheme !== 'scrypt') return false;

  const [n, r, p] = [cost, blockSize, parallelization].map(Number);
  if (![n, r, p].every((value) => Number.isInteger(value) && value > 0)) {
    return false;
  }

  const expectedKey = Buffer.from(expected, 'base64');
  if (expectedKey.length !== KEY_BYTES) return false;

  // Los parámetros vienen de la base: N debe ser potencia de dos y caber en
  // memoria, cosas que solo detecta scrypt al derivar.
  const key = await derive(
    password,
    Buffer.from(salt, 'base64'),
    n,
    r,
    p,
  ).catch(() => null);
  return key !== null && timingSafeEqual(key, expectedKey);
}
