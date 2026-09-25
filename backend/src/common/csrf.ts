import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE, readCookie } from './auth.js';

/** GET/HEAD/OPTIONS no cambian estado; el resto sí. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const originOf = (url: string | undefined) => {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

/**
 * Orígenes del frontend declarados en CORS_ORIGIN, normalizados: una barra final
 * o un espacio (`https://app.vercel.app/`) no deben dejar fuera al propio sitio.
 * Lo usan CORS y la comprobación de origen, para que nunca discrepen.
 */
export const corsOrigins = () =>
  (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => originOf(value.trim()))
    .filter((value): value is string => Boolean(value));

const hostOf = (origin: string) => new URL(origin).host;

/**
 * Hosts que son "este mismo sitio": el del backend (Swagger UI) y el que
 * atendió al navegador cuando la petición llega reenviada por un proxy (los
 * rewrites de Next en Vercel ponen su dominio en X-Forwarded-Host). Una web
 * ajena no controla ninguno de los dos: el formulario de evil.com llega con
 * Origin evil.com, y ese no coincide con el host al que apuntó.
 */
const sameSiteHosts = (request: Request) =>
  [request.get('host'), request.get('x-forwarded-host')?.split(',')[0]]
    .map((host) => host?.trim().toLowerCase())
    .filter(Boolean);

const isAllowed = (request: Request, origin: string) =>
  corsOrigins().includes(origin) ||
  sameSiteHosts(request).includes(hostOf(origin));

/**
 * El navegador adjunta las cookies de sesión a cualquier petición que salga
 * hacia este servidor, también a la que dispare un formulario de otra web. CORS
 * no lo impide: bloquea leer la respuesta, no enviarla. Con COOKIE_SAMESITE=none
 * —necesario cuando el frontend vive en otro dominio— esa petición cruzada llega
 * autenticada, así que hay que rechazarla por origen.
 *
 * Solo se exige a las peticiones que ya traen sesión: las públicas y las que se
 * identifican con la cabecera x-admin-key no son atacables por esta vía.
 *
 * ponytail: validar el origen basta y no necesita estado; un token sincronizado
 * hace falta si algún día hay clientes de navegador sin cabecera Origin.
 */
export function csrfOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const hasSession =
    readCookie(request, ACCESS_COOKIE) ?? readCookie(request, REFRESH_COOKIE);
  if (SAFE_METHODS.has(request.method) || !hasSession) return next();

  // Origin viaja en toda petición de navegador que cambie estado; si falta —y
  // tampoco hay Referer— quien llama no es una página web (curl, otro servidor).
  const origin =
    originOf(request.get('origin')) ?? originOf(request.get('referer'));
  if (origin && !isAllowed(request, origin)) {
    throw new ForbiddenException(`Origen no permitido: ${origin}`);
  }
  next();
}
