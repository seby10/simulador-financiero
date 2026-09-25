import { SignJWT } from 'jose';
import { UserRole } from '../generated/prisma/enums.js';
import {
  accessTtlSeconds,
  hashRefreshToken,
  newRefreshToken,
  refreshTtlSeconds,
  signAccessToken,
  verifyAccessToken,
} from './tokens.js';

const SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres';
const key = () => new TextEncoder().encode(SECRET);
const claims = {
  sub: 'u-1',
  sid: 's-1',
  email: 'a@b.ec',
  role: UserRole.ADMIN,
};

/** Firma un token a medida para probar claims que la API pública no permite emitir. */
const forge = (payload: Record<string, unknown>, expiration = '5m') =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(key());

describe('tokens', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  describe('JWT_SECRET', () => {
    it('falla cerrado si no está definida', async () => {
      delete process.env.JWT_SECRET;
      await expect(signAccessToken(claims)).rejects.toThrow(
        'JWT_SECRET no configurada',
      );
    });

    it('rechaza un secreto de menos de 32 caracteres', async () => {
      process.env.JWT_SECRET = 'corto';
      await expect(signAccessToken(claims)).rejects.toThrow(
        'JWT_SECRET no configurada',
      );
    });

    it('no enmascara la mala configuración como 401 al verificar', async () => {
      const token = await signAccessToken(claims);
      delete process.env.JWT_SECRET;
      await expect(verifyAccessToken(token)).rejects.toThrow(
        'JWT_SECRET no configurada',
      );
    });
  });

  describe('tiempos de vida', () => {
    it('usa los valores por defecto', () => {
      expect(accessTtlSeconds()).toBe(900);
      expect(refreshTtlSeconds()).toBe(2_592_000);
    });

    it('trata la cadena vacía como ausente', () => {
      process.env.ACCESS_TOKEN_TTL_SECONDS = '';
      expect(accessTtlSeconds()).toBe(900);
    });

    it('respeta un valor configurado', () => {
      process.env.ACCESS_TOKEN_TTL_SECONDS = '60';
      expect(accessTtlSeconds()).toBe(60);
    });

    it.each(['abc', '0', '-30', '1.5'])('rechaza %j', (value) => {
      process.env.REFRESH_TOKEN_TTL_SECONDS = value;
      expect(() => refreshTtlSeconds()).toThrow('entero de segundos');
    });
  });

  describe('access token', () => {
    it('va y vuelve con los mismos claims', async () => {
      const token = await signAccessToken(claims);
      await expect(verifyAccessToken(token)).resolves.toEqual(claims);
    });

    it('rechaza una firma manipulada', async () => {
      const token = await signAccessToken(claims);
      await expect(verifyAccessToken(`${token}x`)).rejects.toThrow(
        'Sesión inválida o expirada',
      );
    });

    it('rechaza un token firmado con otro secreto', async () => {
      const token = await signAccessToken(claims);
      process.env.JWT_SECRET = `${SECRET}-distinto`;
      await expect(verifyAccessToken(token)).rejects.toThrow(
        'Sesión inválida o expirada',
      );
    });

    it('rechaza un token expirado', async () => {
      const token = await forge({ ...claims }, '-1s');
      await expect(verifyAccessToken(token)).rejects.toThrow(
        'Sesión inválida o expirada',
      );
    });

    it.each([
      ['sin sub', { sid: 's-1', email: 'a@b.ec', role: UserRole.ADMIN }],
      ['sin sid', { sub: 'u-1', email: 'a@b.ec', role: UserRole.ADMIN }],
      [
        'con sid vacío',
        { sub: 'u-1', sid: '', email: 'a@b.ec', role: UserRole.ADMIN },
      ],
      [
        'con sid no textual',
        { sub: 'u-1', sid: 7, email: 'a@b.ec', role: UserRole.ADMIN },
      ],
      ['sin email', { sub: 'u-1', sid: 's-1', role: UserRole.ADMIN }],
      [
        'con rol desconocido',
        { sub: 'u-1', sid: 's-1', email: 'a@b.ec', role: 'ROOT' },
      ],
    ])('rechaza un token %s', async (_, payload) => {
      const token = await forge(payload);
      await expect(verifyAccessToken(token)).rejects.toThrow(
        'Sesión inválida o expirada',
      );
    });
  });

  describe('refresh token', () => {
    it('genera valores distintos en cada llamada', () => {
      expect(newRefreshToken()).not.toBe(newRefreshToken());
    });

    it('es url-safe y de 256 bits', () => {
      const token = newRefreshToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    });

    it('se resume de forma determinista', () => {
      const token = newRefreshToken();
      expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
      expect(hashRefreshToken(token)).toHaveLength(64);
      expect(hashRefreshToken(token)).not.toBe(hashRefreshToken('otro'));
    });
  });
});
