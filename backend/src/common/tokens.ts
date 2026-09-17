import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '../generated/prisma/enums.js';

const ALGORITHM = 'HS256';
const MIN_SECRET_LENGTH = 32;

/** Claims propios del access token; `sub` es el id del usuario. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * Secreto HMAC leído en cada uso (no al importar) para que las pruebas y los
 * reinicios de configuración lo vean cambiar. Falla cerrado: sin secreto válido
 * no se firma ni se verifica nada.
 */
function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < MIN_SECRET_LENGTH) {
    throw new ServiceUnavailableException(
      `JWT_SECRET no configurada (mínimo ${MIN_SECRET_LENGTH} caracteres)`,
    );
  }
  return new TextEncoder().encode(value);
}

const seconds = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ServiceUnavailableException(
      `${name} debe ser un entero de segundos mayor a 0`,
    );
  }
  return parsed;
};

/** Vida del access token (por defecto 15 min). */
export const accessTtlSeconds = () => seconds('ACCESS_TOKEN_TTL_SECONDS', 900);
/** Vida del refresh token (por defecto 30 días). */
export const refreshTtlSeconds = () =>
  seconds('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30);

export async function signAccessToken(
  claims: AccessTokenClaims,
): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${accessTtlSeconds()}s`)
    .sign(secret());
}

const isRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && value in UserRole;

/**
 * Verifica firma, expiración y forma de los claims. `algorithms` fijo en HS256
 * cierra la confusión de algoritmo (un token con `alg: none` o RS256 se rechaza).
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
    });
    const { sub, email, role } = payload;
    if (!sub || typeof email !== 'string' || !isRole(role)) {
      throw new Error('claims incompletos');
    }
    return { sub, email, role };
  } catch {
    throw new UnauthorizedException('Sesión inválida o expirada');
  }
}

// ───────────────────────── Refresh tokens ─────────────────────────

/**
 * El refresh token es opaco (no un JWT): su validez vive en AuthSession, lo que
 * permite rotarlo y revocarlo de verdad. En la base solo se guarda su SHA-256.
 */
export const newRefreshToken = () => randomBytes(32).toString('base64url');

export const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
