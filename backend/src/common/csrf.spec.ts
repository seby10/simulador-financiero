import type { Request, Response } from 'express';
import { ACCESS_COOKIE } from './auth.js';
import { csrfOrigin } from './csrf.js';

const FRONTEND = 'http://localhost:3000';
const BACKEND_HOST = 'localhost:3001';

const requestWith = ({
  method = 'POST',
  origin,
  referer,
  cookies = { [ACCESS_COOKIE]: 'un-token' },
}: {
  method?: string;
  origin?: string;
  referer?: string;
  cookies?: Record<string, string>;
}) =>
  ({
    method,
    cookies,
    protocol: 'http',
    get: (name: string) =>
      ({ origin, referer, host: BACKEND_HOST })[name.toLowerCase()],
  }) as unknown as Request;

const run = (request: Request) => {
  let called = false;
  csrfOrigin(request, {} as Response, () => {
    called = true;
  });
  return called;
};

describe('csrfOrigin', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.CORS_ORIGIN = FRONTEND;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it('rechaza un POST con sesión desde otro origen', () => {
    expect(() =>
      run(requestWith({ origin: 'https://sitio-malicioso.example' })),
    ).toThrow('Origen no permitido');
  });

  it('rechaza también cuando el origen solo viene en Referer', () => {
    expect(() =>
      run(requestWith({ referer: 'https://sitio-malicioso.example/pagina' })),
    ).toThrow('Origen no permitido');
  });

  it('acepta el origen del frontend', () => {
    expect(run(requestWith({ origin: FRONTEND }))).toBe(true);
  });

  it('acepta el propio backend (Swagger UI)', () => {
    expect(run(requestWith({ origin: `http://${BACKEND_HOST}` }))).toBe(true);
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('deja pasar %s', (method) => {
    expect(
      run(requestWith({ method, origin: 'https://sitio-malicioso.example' })),
    ).toBe(true);
  });

  it('deja pasar una petición sin cookies de sesión', () => {
    expect(
      run(
        requestWith({ origin: 'https://sitio-malicioso.example', cookies: {} }),
      ),
    ).toBe(true);
  });

  it('deja pasar a un cliente que no es navegador (sin Origin ni Referer)', () => {
    expect(run(requestWith({}))).toBe(true);
  });

  it('ignora un Referer que no es una URL', () => {
    expect(run(requestWith({ referer: 'no-es-una-url' }))).toBe(true);
  });
});
