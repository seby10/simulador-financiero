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

/** Orígenes del frontend (CORS_ORIGIN) más el del propio backend (Swagger UI). */
const allowed = (request: Request) => {
  const configured = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const host = request.get('host');
  return new Set(
    host ? [...configured, `${request.protocol}://${host}`] : configured,
  );
};

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
  if (origin && !allowed(request).has(origin)) {
    throw new ForbiddenException(`Origen no permitido: ${origin}`);
  }
  next();
}
