import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { UserRole } from '../generated/prisma/enums.js';
import { AccessTokenClaims, verifyAccessToken } from './tokens.js';

export const ADMIN_KEY_HEADER = 'x-admin-key';
export const ADMIN_SECURITY = 'admin';
export const SESSION_SECURITY = 'session';

/** Cookies httpOnly: el JavaScript del navegador nunca toca los tokens. */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

declare global {
  namespace Express {
    interface Request {
      /** Lo puebla JwtAuthGuard/AdminGuard tras verificar el access token. */
      user?: AccessTokenClaims;
    }
  }
}

const digest = (value: string) => createHash('sha256').update(value).digest();

export const readCookie = (request: Request, name: string) =>
  (request.cookies as Record<string, string> | undefined)?.[name];

const INVALID_ADMIN = 'Credencial de administrador inválida';

/** Verifica el access token de la cookie y deja los claims en `request.user`. */
async function authenticate(request: Request): Promise<AccessTokenClaims> {
  const token = readCookie(request, ACCESS_COOKIE);
  if (!token) {
    throw new UnauthorizedException('Sesión ausente');
  }
  const claims = await verifyAccessToken(token);
  request.user = claims;
  return claims;
}

const httpRequest = (context: ExecutionContext) =>
  context.switchToHttp().getRequest<Request>();

/** Exige una sesión válida (cookie de access token). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await authenticate(httpRequest(context));
    return true;
  }
}

/**
 * Acceso administrativo por dos vías mientras conviven ambos esquemas:
 * la cabecera `x-admin-key` (integraciones servidor-a-servidor ya existentes)
 * o una sesión con rol ADMIN.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = httpRequest(context);
    const provided = request.header(ADMIN_KEY_HEADER);
    // Si el cliente mandó la cabecera, esa es la vía elegida: no se cae a la sesión.
    if (provided !== undefined) {
      const expected = process.env.ADMIN_API_KEY;
      // Falla cerrado: sin clave configurada nadie entra por esta vía.
      if (!expected) {
        throw new ServiceUnavailableException('ADMIN_API_KEY no configurada');
      }
      // Digests de igual longitud → comparación en tiempo constante.
      if (!timingSafeEqual(digest(provided), digest(expected))) {
        throw new UnauthorizedException(INVALID_ADMIN);
      }
      return true;
    }

    if (!readCookie(request, ACCESS_COOKIE)) {
      throw new UnauthorizedException(INVALID_ADMIN);
    }
    const { role } = await authenticate(request);
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Se requiere rol de administrador');
    }
    return true;
  }
}

/** Restringe la ruta a sesiones autenticadas y la documenta en OpenAPI. */
export const Authenticated = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiCookieAuth(SESSION_SECURITY),
    ApiUnauthorizedResponse({
      description: 'Sesión ausente, inválida o expirada',
    }),
  );

/** Restringe la ruta a administradores (cabecera o sesión) y la documenta. */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(AdminGuard),
    ApiSecurity(ADMIN_SECURITY),
    ApiCookieAuth(SESSION_SECURITY),
    ApiUnauthorizedResponse({
      description: `Cabecera ${ADMIN_KEY_HEADER} o sesión ausente o inválida`,
    }),
    ApiForbiddenResponse({ description: 'La sesión no tiene rol ADMIN' }),
    ApiServiceUnavailableResponse({
      description: 'ADMIN_API_KEY o JWT_SECRET no configuradas en el servidor',
    }),
  );

/** Extraído aparte del decorador para poder probarlo sin montar una ruta. */
export const currentUser = (
  property: keyof AccessTokenClaims | undefined,
  context: ExecutionContext,
) => {
  const { user } = httpRequest(context);
  if (!user) {
    // Sin guard delante no hay claims que entregar: es un error de programación.
    throw new UnauthorizedException('Sesión ausente');
  }
  return property ? user[property] : user;
};

/** Claims de la sesión actual (o una de sus propiedades). */
export const CurrentUser = createParamDecorator(currentUser);
