import type { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums.js';
import {
  ACCESS_COOKIE,
  AdminGuard,
  AdminOnly,
  Authenticated,
  currentUser,
  JwtAuthGuard,
  readCookie,
} from './auth.js';
import { signAccessToken } from './tokens.js';

const SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres';

interface RequestStub {
  header: (name: string) => string | undefined;
  cookies?: Record<string, string>;
  user?: unknown;
}

const contextFor = (request: RequestStub) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const requestWith = ({
  adminKey,
  accessToken,
}: { adminKey?: string; accessToken?: string } = {}): RequestStub => ({
  header: () => adminKey,
  cookies: accessToken === undefined ? {} : { [ACCESS_COOKIE]: accessToken },
});

const guardsOf = (decorate: () => MethodDecorator) => {
  class Controller {
    handler() {}
  }
  decorate()(
    Controller.prototype,
    'handler',
    Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')!,
  );
  const { value: handler } = Object.getOwnPropertyDescriptor(
    Controller.prototype,
    'handler',
  )!;
  return Reflect.getMetadata('__guards__', handler) as unknown[];
};

describe('auth', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.ADMIN_API_KEY = 'secreto-admin';
  });
  afterEach(() => {
    process.env = { ...env };
  });

  const tokenFor = (role: UserRole) =>
    signAccessToken({ sub: 'u-1', email: 'a@b.ec', role });

  describe('readCookie', () => {
    it('devuelve el valor cuando existe', () => {
      const request = requestWith({ accessToken: 'abc' });
      expect(readCookie(request as never, ACCESS_COOKIE)).toBe('abc');
    });

    it('devuelve undefined sin cookie-parser', () => {
      expect(
        readCookie({ header: () => undefined } as never, ACCESS_COOKIE),
      ).toBeUndefined();
    });
  });

  describe('JwtAuthGuard', () => {
    const guard = new JwtAuthGuard();

    it('acepta un access token válido y publica los claims', async () => {
      const request = requestWith({
        accessToken: await tokenFor(UserRole.CUSTOMER),
      });
      const context = contextFor(request);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toMatchObject({
        sub: 'u-1',
        email: 'a@b.ec',
        role: UserRole.CUSTOMER,
      });
    });

    it('rechaza cuando no hay cookie', async () => {
      await expect(
        guard.canActivate(contextFor(requestWith())),
      ).rejects.toThrow('Sesión ausente');
    });

    it('rechaza un token manipulado', async () => {
      const valid = await tokenFor(UserRole.CUSTOMER);
      const request = requestWith({ accessToken: `${valid}x` });
      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'Sesión inválida o expirada',
      );
    });
  });

  describe('AdminGuard por cabecera', () => {
    const guard = new AdminGuard();

    it('permite la clave correcta', async () => {
      await expect(
        guard.canActivate(
          contextFor(requestWith({ adminKey: 'secreto-admin' })),
        ),
      ).resolves.toBe(true);
    });

    it.each(['', 'secreto-admin-x'])(
      'rechaza la clave %j',
      async (adminKey) => {
        await expect(
          guard.canActivate(contextFor(requestWith({ adminKey }))),
        ).rejects.toThrow('Credencial de administrador inválida');
      },
    );

    it('falla cerrado sin ADMIN_API_KEY', async () => {
      delete process.env.ADMIN_API_KEY;
      await expect(
        guard.canActivate(contextFor(requestWith({ adminKey: '' }))),
      ).rejects.toThrow('ADMIN_API_KEY no configurada');
    });
  });

  describe('AdminGuard por sesión', () => {
    const guard = new AdminGuard();

    it('permite una sesión con rol ADMIN', async () => {
      const request = requestWith({
        accessToken: await tokenFor(UserRole.ADMIN),
      });
      await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    });

    it('rechaza una sesión sin rol ADMIN', async () => {
      const request = requestWith({
        accessToken: await tokenFor(UserRole.CUSTOMER),
      });
      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'Se requiere rol de administrador',
      );
    });

    it('rechaza cuando no hay ninguna credencial', async () => {
      await expect(
        guard.canActivate(contextFor(requestWith())),
      ).rejects.toThrow('Credencial de administrador inválida');
    });
  });

  describe('decoradores', () => {
    it('@Authenticated registra JwtAuthGuard', () => {
      expect(guardsOf(Authenticated)).toEqual([JwtAuthGuard]);
    });

    it('@AdminOnly registra AdminGuard', () => {
      expect(guardsOf(AdminOnly)).toEqual([AdminGuard]);
    });
  });

  describe('currentUser', () => {
    const claims = {
      sub: 'u-1',
      email: 'a@b.ec',
      role: UserRole.CUSTOMER,
    };

    it('devuelve todos los claims sin propiedad', () => {
      const context = contextFor({ header: () => undefined, user: claims });
      expect(currentUser(undefined, context)).toEqual(claims);
    });

    it('devuelve una sola propiedad', () => {
      const context = contextFor({ header: () => undefined, user: claims });
      expect(currentUser('sub', context)).toBe('u-1');
    });

    it('falla si ningún guard pobló la sesión', () => {
      const context = contextFor({ header: () => undefined });
      expect(() => currentUser('sub', context)).toThrow('Sesión ausente');
    });
  });
});
