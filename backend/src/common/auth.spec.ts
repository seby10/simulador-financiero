import type { ExecutionContext } from '@nestjs/common';
import { AdminGuard, AdminOnly } from './auth.js';

const contextWith = (key?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ header: () => key }),
    }),
  }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  const guard = new AdminGuard();
  const original = process.env.ADMIN_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = original;
  });

  it('permite la clave correcta', () => {
    process.env.ADMIN_API_KEY = 'secreto-admin';
    expect(guard.canActivate(contextWith('secreto-admin'))).toBe(true);
  });

  it.each([undefined, '', 'secreto-admin-x'])('rechaza %j', (key) => {
    process.env.ADMIN_API_KEY = 'secreto-admin';
    expect(() => guard.canActivate(contextWith(key))).toThrow(
      'Credencial de administrador inválida',
    );
  });

  it('falla cerrado sin ADMIN_API_KEY', () => {
    delete process.env.ADMIN_API_KEY;
    expect(() => guard.canActivate(contextWith(''))).toThrow(
      'ADMIN_API_KEY no configurada',
    );
  });
});

describe('@AdminOnly', () => {
  it('registra AdminGuard en la ruta', () => {
    class Controller {
      @AdminOnly()
      handler() {}
    }
    expect(
      Reflect.getMetadata('__guards__', Controller.prototype.handler),
    ).toEqual([AdminGuard]);
  });
});
