import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PRIVATE_UPLOADS } from '../src/common/http.js';
import { PrismaService } from '../src/database/prisma.service.js';

// Requiere DATABASE_URL con migraciones y seed aplicados.
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    try {
      process.loadEnvFile();
    } catch {
      // CI: variables provistas por el entorno
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // Igual que en main.ts: sin esto los guards no ven las cookies de sesión.
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it('simula crédito francés con saldo final 0.00', async () => {
    const { body: types } = await request(app.getHttpServer())
      .get('/api/credit/types')
      .expect(200);
    const consumo = types.find((t: { name: string }) => t.name === 'Consumo');
    const { body } = await request(app.getHttpServer())
      .post('/api/credit/simulate')
      .send({
        creditTypeId: consumo.id,
        amount: 5000,
        termMonths: 24,
        method: 'FRENCH',
      })
      .expect(200);
    expect(body.schedule).toHaveLength(24);
    expect(body.schedule.at(-1).closingBalance).toBe('0.00');
    expect(body.summary.totalPrincipal).toBe('5000.00');
  });

  it('rechaza montos con más de 2 decimales', () =>
    request(app.getHttpServer())
      .post('/api/credit/simulate')
      .send({
        creditTypeId: 1,
        amount: '10.001',
        termMonths: 12,
        method: 'GERMAN',
      })
      .expect(400));

  it('devuelve PDF del certificado de inversión', async () => {
    const { body: plans } = await request(app.getHttpServer())
      .get('/api/investment/plans')
      .expect(200);
    const res = await request(app.getHttpServer())
      .post('/api/investment/simulate/pdf')
      .send({
        planId: plans[0].id,
        amount: plans[0].minAmount,
        termDays: plans[0].termMinDays,
        payoutMethod: 'AT_MATURITY',
      })
      .expect(200)
      .expect('Content-Type', 'application/pdf');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('cargas concurrentes de documentos conservan todas las URLs', async () => {
    const server = app.getHttpServer();
    const { body: plans } = await request(server)
      .get('/api/investment/plans')
      .expect(200);
    const plan = plans[0];
    const { body: application } = await request(server)
      .post('/api/onboarding/apply')
      .send({
        applicantFullName: 'Prueba Concurrencia',
        applicantIdNumber: '1710034065',
        email: 'e2e@example.com',
        phone: '0991234567',
        sourceOfFunds: 'e2e',
        investmentPlanId: plan.id,
        amount: plan.minAmount,
        termDays: plan.termMinDays,
        payoutMethod: 'AT_MATURITY',
      })
      .expect(201);

    try {
      const png = Buffer.from('89504e470d0a1a0a', 'hex');
      await Promise.all(
        ['idFront', 'idBack', 'utilityBill'].map((field) =>
          request(server)
            .post(`/api/onboarding/${application.id}/documents`)
            .attach(field, png, 'doc.png')
            .expect(201),
        ),
      );
      const { body } = await request(server)
        .get(`/api/onboarding/applications/${application.id}`)
        .set('x-admin-key', process.env.ADMIN_API_KEY!)
        .expect(200);
      expect(Object.keys(body.documentUrls).sort()).toEqual([
        'idBack',
        'idFront',
        'utilityBill',
      ]);
    } finally {
      await app
        .get(PrismaService)
        .investmentApplication.delete({ where: { id: application.id } });
      await rm(join(PRIVATE_UPLOADS, 'onboarding', application.id), {
        recursive: true,
        force: true,
      });
    }
  });

  // ───────────────────────── Biometría ─────────────────────────

  describe('verificación biométrica', () => {
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    /**
     * El proveedor simulado deriva los puntajes del SHA-256 de las imágenes, así
     * que estas dos capturas dan siempre el mismo veredicto contra `png`:
     * s0 → 76.63 / 89.44 (pasa), s2 → 73.02 / 93.36 (vivacidad insuficiente).
     */
    const selfie = (suffix: string) =>
      `data:image/png;base64,${Buffer.concat([png, Buffer.from(suffix)]).toString('base64')}`;

    /** Solicitud nueva con los tres documentos ya cargados. */
    const applicationWithDocuments = async () => {
      const server = app.getHttpServer();
      const { body: plans } = await request(server)
        .get('/api/investment/plans')
        .expect(200);
      const plan = plans[0];
      const { body: application } = await request(server)
        .post('/api/onboarding/apply')
        .send({
          applicantFullName: 'Prueba Biometría',
          applicantIdNumber: '1710034065',
          email: 'biometria@example.com',
          phone: '0991234567',
          sourceOfFunds: 'e2e',
          investmentPlanId: plan.id,
          amount: plan.minAmount,
          termDays: plan.termMinDays,
          payoutMethod: 'AT_MATURITY',
        })
        .expect(201);
      for (const field of ['idFront', 'idBack', 'utilityBill']) {
        await request(server)
          .post(`/api/onboarding/${application.id}/documents`)
          .attach(field, png, 'doc.png')
          .expect(201);
      }
      return application.id as string;
    };

    const cleanUp = async (id: string) => {
      await app
        .get(PrismaService)
        .investmentApplication.delete({ where: { id } });
      await rm(join(PRIVATE_UPLOADS, 'onboarding', id), {
        recursive: true,
        force: true,
      });
    };

    it('aprueba la solicitud cuando ambos puntajes pasan el umbral', async () => {
      const id = await applicationWithDocuments();
      try {
        const { body } = await request(app.getHttpServer())
          .post(`/api/biometrics/applications/${id}/verify`)
          .send({ selfieBase64: selfie('s0') })
          .expect(200);
        expect(body).toMatchObject({
          applicationId: id,
          attempt: 1,
          passed: true,
          status: 'APPROVED',
          remainingAttempts: 2,
          failureReason: null,
          checks: { liveness: 'PASSED', faceMatch: 'MATCH' },
        });

        const { body: application } = await request(app.getHttpServer())
          .get(`/api/onboarding/applications/${id}`)
          .set('x-admin-key', process.env.ADMIN_API_KEY!)
          .expect(200);
        expect(application.status).toBe('APPROVED');
        expect(application.biometricScore).toBe(body.matchScore);
      } finally {
        await cleanUp(id);
      }
    });

    it('rechaza sin aprobar y deja registrado el intento', async () => {
      const id = await applicationWithDocuments();
      try {
        const { body } = await request(app.getHttpServer())
          .post(`/api/biometrics/applications/${id}/verify`)
          .send({ selfieBase64: selfie('s2') })
          .expect(200);
        expect(body).toMatchObject({
          passed: false,
          status: 'PENDING_REVIEW',
          checks: { liveness: 'FAILED', faceMatch: 'MATCH' },
        });
        expect(body.failureReason).toContain('Prueba de vida insuficiente');

        const { body: history } = await request(app.getHttpServer())
          .get(`/api/biometrics/applications/${id}`)
          .set('x-admin-key', process.env.ADMIN_API_KEY!)
          .expect(200);
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ attempt: 1, passed: false });
      } finally {
        await cleanUp(id);
      }
    });

    it('agota los intentos y pide revisión manual', async () => {
      const id = await applicationWithDocuments();
      try {
        const server = app.getHttpServer();
        // Tres capturas distintas que fallan, hasta consumir el límite.
        for (const suffix of ['s2', 's6', 's10']) {
          await request(server)
            .post(`/api/biometrics/applications/${id}/verify`)
            .send({ selfieBase64: selfie(suffix) })
            .expect(200);
        }
        await request(server)
          .post(`/api/biometrics/applications/${id}/verify`)
          .send({ selfieBase64: selfie('s0') })
          .expect(429);
      } finally {
        await cleanUp(id);
      }
    });

    it('exige los documentos antes de verificar', async () => {
      const server = app.getHttpServer();
      const { body: plans } = await request(server)
        .get('/api/investment/plans')
        .expect(200);
      const { body: application } = await request(server)
        .post('/api/onboarding/apply')
        .send({
          applicantFullName: 'Sin Documentos',
          applicantIdNumber: '1710034065',
          email: 'sin-docs@example.com',
          phone: '0991234567',
          sourceOfFunds: 'e2e',
          investmentPlanId: plans[0].id,
          amount: plans[0].minAmount,
          termDays: plans[0].termMinDays,
          payoutMethod: 'AT_MATURITY',
        })
        .expect(201);
      try {
        await request(server)
          .post(`/api/biometrics/applications/${application.id}/verify`)
          .send({ selfieBase64: selfie('s0') })
          .expect(400);
      } finally {
        await cleanUp(application.id);
      }
    });

    it('rechaza una captura que no es una imagen', async () => {
      const id = await applicationWithDocuments();
      try {
        await request(app.getHttpServer())
          .post(`/api/biometrics/applications/${id}/verify`)
          .send({
            selfieBase64: Buffer.from('esto no es un png').toString('base64'),
          })
          .expect(400);
      } finally {
        await cleanUp(id);
      }
    });

    it('el historial es solo para administradores', async () => {
      const id = await applicationWithDocuments();
      try {
        await request(app.getHttpServer())
          .get(`/api/biometrics/applications/${id}`)
          .expect(401);
      } finally {
        await cleanUp(id);
      }
    });
  });

  describe('rutas administrativas', () => {
    it('rechazan peticiones sin clave o con clave incorrecta', async () => {
      const server = app.getHttpServer();
      await request(server).get('/api/onboarding/applications').expect(401);
      await request(server)
        .get('/api/onboarding/applications')
        .set('x-admin-key', 'incorrecta')
        .expect(401);
      await request(server).post('/api/credit/types').send({}).expect(401);
      await request(server).put('/api/institution').send({}).expect(401);
    });

    it('permiten el acceso con la clave de administrador', () =>
      request(app.getHttpServer())
        .get('/api/onboarding/applications')
        .set('x-admin-key', process.env.ADMIN_API_KEY!)
        .expect(200));

    it('rechazan una sesión de cliente sin rol ADMIN', async () => {
      const { cookies } = await registerUser();
      try {
        await request(app.getHttpServer())
          .get('/api/onboarding/applications')
          .set('Cookie', cookies)
          .expect(403);
      } finally {
        await deleteUser();
      }
    });
  });

  // ───────────────────────── Sesiones ─────────────────────────

  let lastEmail = '';

  /** Crea un usuario nuevo en cada llamada y devuelve sus cookies de sesión. */
  const registerUser = async () => {
    lastEmail = `e2e-${randomUUID()}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Prueba Sesiones',
        email: lastEmail,
        password: 'contrasena-larga-de-prueba',
      })
      .expect(201);
    return { cookies: response.get('Set-Cookie')!, body: response.body };
  };

  const deleteUser = () =>
    app.get(PrismaService).user.deleteMany({ where: { email: lastEmail } });

  describe('autenticación', () => {
    afterEach(() => deleteUser());

    it('registra, identifica y cierra la sesión', async () => {
      const server = app.getHttpServer();
      const { cookies, body } = await registerUser();
      expect(body.user).toMatchObject({ email: lastEmail, role: 'CUSTOMER' });
      expect(body.user.passwordHash).toBeUndefined();

      const { body: me } = await request(server)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(me.email).toBe(lastEmail);

      await request(server)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(204);
      // El refresh token quedó revocado aunque el navegador conserve la cookie.
      await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);
    });

    it('rechaza /me sin cookies', () =>
      request(app.getHttpServer()).get('/api/auth/me').expect(401));

    it('rechaza el registro con un correo repetido', async () => {
      await registerUser();
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Duplicada',
          email: lastEmail,
          password: 'otra-contrasena-larga',
        })
        .expect(409);
    });

    it('rechaza contraseñas de menos de 12 caracteres', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Corta',
          email: `e2e-${randomUUID()}@example.com`,
          password: 'corta123',
        })
        .expect(400);
    });

    it('rechaza credenciales incorrectas con el mismo error', async () => {
      await registerUser();
      const server = app.getHttpServer();
      await request(server)
        .post('/api/auth/login')
        .send({ email: lastEmail, password: 'contrasena-equivocada' })
        .expect(401);
      await request(server)
        .post('/api/auth/login')
        .send({
          email: `nadie-${randomUUID()}@example.com`,
          password: 'contrasena-equivocada',
        })
        .expect(401);
    });

    it('rota el refresh token y revoca la familia si se reusa', async () => {
      const server = app.getHttpServer();
      const { cookies } = await registerUser();

      const rotated = await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);
      const nuevas = rotated.get('Set-Cookie')!;
      expect(nuevas).not.toEqual(cookies);

      // Reusar el token viejo delata un robo: se revoca toda la cadena.
      await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);
      // Y por eso el token nuevo, legítimo, también deja de servir.
      await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', nuevas)
        .expect(401);
    });
  });
});
