import type { ExecutionContext } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service.js';
import { IdentityStatus, UserRole } from '../generated/prisma/enums.js';
import {
  ACCESS_COOKIE,
  AdminGuard,
  AdminOnly,
  Authenticated,
  currentUser,
  IDENTITY_REQUIRED,
  IdentityVerifiedGuard,
  JwtAuthGuard,
  readCookie,
  VerifiedIdentity,
} from './auth.js';
import { signAccessToken } from './tokens.js';

const SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres';

/** Lo que devuelve la consulta de sesión de `authenticate`. */
type SessionRow = {
  revokedAt: Date | null;
  user: { isActive: boolean };
} | null;

const LIVE: SessionRow = { revokedAt: null, user: { isActive: true } };

const prismaWith = (
  session: SessionRow,
  identityStatus?: IdentityStatus | null,
) =>
  ({
    authSession: { findUnique: () => Promise.resolve(session) },
    user: {
      findUnique: () =>
        Promise.resolve(
          identityStatus === null || identityStatus === undefined
            ? null
            : { identityStatus },
        ),
    },
  }) as unknown as PrismaService;

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
    signAccessToken({ sub: 'u-1', sid: 's-1', email: 'a@b.ec', role });

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
    const guard = new JwtAuthGuard(prismaWith(LIVE));

    it('acepta un access token válido y publica los claims', async () => {
      const request = requestWith({
        accessToken: await tokenFor(UserRole.CUSTOMER),
      });
      const context = contextFor(request);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toMatchObject({
        sub: 'u-1',
        sid: 's-1',
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

  // Un access token firmado sigue siendo válido hasta expirar: lo que corta el
  // acceso tras cerrar sesión o desactivar la cuenta es la consulta a AuthSession.
  describe('revocación de la sesión', () => {
    it.each([
      ['la sesión ya no existe', null],
      [
        'la sesión fue revocada',
        { revokedAt: new Date(), user: { isActive: true } },
      ],
      [
        'la cuenta fue desactivada',
        { revokedAt: null, user: { isActive: false } },
      ],
    ])('rechaza cuando %s', async (_, session: SessionRow) => {
      const guard = new JwtAuthGuard(prismaWith(session));
      const request = requestWith({
        accessToken: await tokenFor(UserRole.CUSTOMER),
      });
      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'Sesión cerrada o revocada',
      );
      expect(request.user).toBeUndefined();
    });

    it('también corta la vía de sesión de AdminGuard', async () => {
      const guard = new AdminGuard(prismaWith(null));
      const request = requestWith({
        accessToken: await tokenFor(UserRole.ADMIN),
      });
      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'Sesión cerrada o revocada',
      );
    });
  });

  describe('AdminGuard por cabecera', () => {
    const guard = new AdminGuard(prismaWith(LIVE));

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
    const guard = new AdminGuard(prismaWith(LIVE));

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

  describe('IdentityVerifiedGuard', () => {
    const guardFor = (identityStatus: IdentityStatus | null) =>
      new IdentityVerifiedGuard(prismaWith(LIVE, identityStatus));

    const contextForRole = async (role: UserRole) =>
      contextFor(requestWith({ accessToken: await tokenFor(role) }));

    it('deja pasar a un cliente con la identidad verificada', async () => {
      await expect(
        guardFor(IdentityStatus.VERIFIED).canActivate(
          await contextForRole(UserRole.CUSTOMER),
        ),
      ).resolves.toBe(true);
    });

    // El personal administrativo no se enrola con biometría: ni se consulta.
    it('deja pasar a un administrador sin mirar su identidad', async () => {
      await expect(
        guardFor(null).canActivate(await contextForRole(UserRole.ADMIN)),
      ).resolves.toBe(true);
    });

    it.each([IdentityStatus.PENDING, IdentityStatus.LOCKED, null])(
      'frena a un cliente con identidad %s',
      async (identityStatus) => {
        const context = await contextForRole(UserRole.CUSTOMER);
        await expect(
          guardFor(identityStatus).canActivate(context),
        ).rejects.toMatchObject({
          response: { error: IDENTITY_REQUIRED, statusCode: 403 },
        });
      },
    );
  });

  describe('decoradores', () => {
    it('@Authenticated registra JwtAuthGuard', () => {
      expect(guardsOf(Authenticated)).toEqual([JwtAuthGuard]);
    });

    it('@AdminOnly registra AdminGuard', () => {
      expect(guardsOf(AdminOnly)).toEqual([AdminGuard]);
    });

    it('@VerifiedIdentity registra IdentityVerifiedGuard', () => {
      expect(guardsOf(VerifiedIdentity)).toEqual([IdentityVerifiedGuard]);
    });
  });

  describe('currentUser', () => {
    const claims = {
      sub: 'u-1',
      sid: 's-1',
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
