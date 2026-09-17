import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_KEY_HEADER = 'x-admin-key';
export const ADMIN_SECURITY = 'admin';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * ponytail: clave compartida para el panel administrativo (usar solo desde el servidor
 * de Next.js, nunca en el navegador). Migrar a JWT + roles cuando existan usuarios admin.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_KEY;
    // Falla cerrado: sin clave configurada nadie accede a rutas administrativas.
    if (!expected) {
      throw new ServiceUnavailableException('ADMIN_API_KEY no configurada');
    }
    const provided =
      context.switchToHttp().getRequest<Request>().header(ADMIN_KEY_HEADER) ??
      '';
    // Digests de igual longitud → comparación en tiempo constante.
    if (!timingSafeEqual(digest(provided), digest(expected))) {
      throw new UnauthorizedException('Credencial de administrador inválida');
    }
    return true;
  }
}

/** Restringe la ruta a administradores y la documenta en OpenAPI. */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(AdminGuard),
    ApiSecurity(ADMIN_SECURITY),
    ApiUnauthorizedResponse({
      description: `Cabecera ${ADMIN_KEY_HEADER} ausente o inválida`,
    }),
  );
