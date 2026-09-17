import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../common/auth.js';
import { accessTtlSeconds, refreshTtlSeconds } from '../../common/tokens.js';

/**
 * El refresh token solo viaja a /api/auth/*: si se filtra un XSS en otra ruta,
 * el navegador ni siquiera lo adjunta.
 */
const REFRESH_PATH = '/api/auth';

const SAME_SITE = ['lax', 'strict', 'none'] as const;
type SameSite = (typeof SAME_SITE)[number];

const sameSite = (): SameSite => {
  const value = process.env.COOKIE_SAMESITE;
  return SAME_SITE.includes(value as SameSite) ? (value as SameSite) : 'lax';
};

/**
 * `secure` se activa solo/automáticamente en producción para que el desarrollo
 * siga funcionando sobre http://localhost. Con el frontend en otro dominio hace
 * falta COOKIE_SAMESITE=none, que el navegador exige junto a Secure.
 */
const base = (): CookieOptions => ({
  httpOnly: true,
  secure:
    process.env.COOKIE_SECURE === 'true' ||
    process.env.NODE_ENV === 'production',
  sameSite: sameSite(),
  domain: process.env.COOKIE_DOMAIN || undefined,
});

export function setSessionCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(),
    path: '/',
    maxAge: accessTtlSeconds() * 1000,
  });
  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(),
    path: REFRESH_PATH,
    maxAge: refreshTtlSeconds() * 1000,
  });
}

/** Debe repetir path/domain del `Set-Cookie` original o el navegador no la borra. */
export function clearSessionCookies(response: Response) {
  response.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
  response.clearCookie(REFRESH_COOKIE, { ...base(), path: REFRESH_PATH });
}
