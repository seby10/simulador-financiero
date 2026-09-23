import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomInt, randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PRIVATE_UPLOADS } from '../src/common/http.js';
import { PrismaService } from '../src/database/prisma.service.js';

/** Cédula válida al azar (provincia 17, verificador módulo 10) para no chocar entre pruebas. */
const randomCedula = () => {
  const digits = [
    1,
    7,
    randomInt(6),
    ...Array.from({ length: 6 }, () => randomInt(10)),
  ];
  const total = digits.reduce((acc, d, idx) => {
    const product = idx % 2 === 0 ? d * 2 : d;
    return acc + (product > 9 ? product - 9 : product);
  }, 0);
  return [...digits, (10 - (total % 10)) % 10].join('');
};

const png = Buffer.from('89504e470d0a1a0a', 'hex');
const pdf = Buffer.from('%PDF-1.4');

/**
 * El proveedor simulado deriva los puntajes del SHA-256 de las imágenes, así
 * que cada captura da siempre el mismo veredicto contra la misma referencia:
 * contra la cédula `png`: s0 → 76.63 / 89.44 (pasa), s2 → 73.02 / 93.36 (vivacidad
 * insuficiente); contra la selfie verificada con s0: r0 pasa, r7 falla.
 */
const selfie = (suffix: string) =>
  `data:image/png;base64,${Buffer.concat([png, Buffer.from(suffix)]).toString('base64')}`;

// Requiere DATABASE_URL con migraciones y seed aplicados.
describe('API (e2e)', () => {
  let app: INestApplication;
  const createdEmails: string[] = [];

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

  afterAll(async () => {
    await app
      .get(PrismaService)
      .user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  // ───────────────────────── Ayudantes ─────────────────────────

  /** Crea un cliente nuevo en cada llamada y devuelve sus cookies de sesión. */
  const registerUser = async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const idNumber = randomCedula();
    createdEmails.push(email);
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        idNumber,
        firstName: 'Prueba',
        lastName: 'Sesiones',
        phone: '0991234567',
        email,
        password: 'contrasena-larga-de-prueba',
      })
      .expect(201);
    return {
      cookies: response.get('Set-Cookie')!,
      body: response.body,
      email,
      idNumber,
    };
  };

  type Customer = Awaited<ReturnType<typeof registerUser>>;

  const apply = async (customer: Customer) => {
    const server = app.getHttpServer();
    const { body: plans } = await request(server)
      .get('/api/investment/plans')
      .expect(200);
    const plan = plans[0];
    const { body } = await request(server)
      .post('/api/onboarding/apply')
      .set('Cookie', customer.cookies)
      .send({
        applicantFullName: 'Prueba E2E',
        applicantIdNumber: customer.idNumber,
        email: customer.email,
        phone: '0991234567',
        sourceOfFunds: 'e2e',
        investmentPlanId: plan.id,
        amount: plan.minAmount,
        termDays: plan.termMinDays,
        payoutMethod: 'AT_MATURITY',
      })
      .expect(201);
    return body.id as string;
  };

  const uploadAll = async (customer: Customer, id: string) => {
    for (const field of ['idFront', 'idBack', 'utilityBill']) {
      await request(app.getHttpServer())
        .post(`/api/onboarding/${id}/documents`)
        .set('Cookie', customer.cookies)
        .attach(field, png, 'doc.png')
        .expect(201);
    }
  };

  /** Cliente nuevo con una solicitud y los tres documentos ya cargados. */
  const applicationWithDocuments = async () => {
    const customer = await registerUser();
    const id = await apply(customer);
    await uploadAll(customer, id);
    return { customer, id };
  };

  const verify = (customer: Customer, id: string, suffix: string) =>
    request(app.getHttpServer())
      .post(`/api/biometrics/applications/${id}/verify`)
      .set('Cookie', customer.cookies)
      .send({ selfieBase64: selfie(suffix) });

  const adminGet = (id: string) =>
    request(app.getHttpServer())
      .get(`/api/onboarding/applications/${id}`)
      .set('x-admin-key', process.env.ADMIN_API_KEY!);

  const adminAction = (id: string, action: 'approve' | 'reject') =>
    request(app.getHttpServer())
      .post(`/api/onboarding/applications/${id}/${action}`)
      .set('x-admin-key', process.env.ADMIN_API_KEY!);

  const cleanUp = async (id: string) => {
    await app
      .get(PrismaService)
      .investmentApplication.delete({ where: { id } });
    await rm(join(PRIVATE_UPLOADS, 'onboarding', id), {
      recursive: true,
      force: true,
    });
  };

  // ───────────────────────── Simuladores ─────────────────────────

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

  // ───────────────────────── Onboarding ─────────────────────────

  describe('solicitudes de inversión', () => {
    it('exigen sesión para solicitar', () =>
      request(app.getHttpServer())
        .post('/api/onboarding/apply')
        .send({})
        .expect(401));

    it('solo aceptan la cédula de la propia cuenta', async () => {
      const customer = await registerUser();
      const other = randomCedula();
      const { body: plans } = await request(app.getHttpServer())
        .get('/api/investment/plans')
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/onboarding/apply')
        .set('Cookie', customer.cookies)
        .send({
          applicantFullName: 'Suplantación',
          applicantIdNumber:
            other === customer.idNumber ? randomCedula() : other,
          email: customer.email,
          phone: '0991234567',
          sourceOfFunds: 'e2e',
          investmentPlanId: plans[0].id,
          amount: plans[0].minAmount,
          termDays: plans[0].termMinDays,
          payoutMethod: 'AT_MATURITY',
        })
        .expect(400);
    });

    it('cargas concurrentes de documentos conservan todas las URLs', async () => {
      const customer = await registerUser();
      const id = await apply(customer);
      try {
        await Promise.all(
          ['idFront', 'idBack', 'utilityBill'].map((field) =>
            request(app.getHttpServer())
              .post(`/api/onboarding/${id}/documents`)
              .set('Cookie', customer.cookies)
              .attach(field, png, 'doc.png')
              .expect(201),
          ),
        );
        const { body } = await adminGet(id).expect(200);
        expect(Object.keys(body.documentUrls).sort()).toEqual([
          'idBack',
          'idFront',
          'utilityBill',
        ]);
      } finally {
        await cleanUp(id);
      }
    });

    it('la cédula frontal debe ser una foto, el reverso puede ser PDF', async () => {
      const customer = await registerUser();
      const id = await apply(customer);
      try {
        await request(app.getHttpServer())
          .post(`/api/onboarding/${id}/documents`)
          .set('Cookie', customer.cookies)
          .attach('idFront', pdf, 'cedula.pdf')
          .expect(400);
        await request(app.getHttpServer())
          .post(`/api/onboarding/${id}/documents`)
          .set('Cookie', customer.cookies)
          .attach('idBack', pdf, 'reverso.pdf')
          .expect(201);
      } finally {
        await cleanUp(id);
      }
    });

    it('otra cuenta no puede cargar documentos ni verse la solicitud', async () => {
      const { id } = await applicationWithDocuments();
      const intruder = await registerUser();
      try {
        await request(app.getHttpServer())
          .post(`/api/onboarding/${id}/documents`)
          .set('Cookie', intruder.cookies)
          .attach('idFront', png, 'doc.png')
          .expect(404);
        const { body } = await request(app.getHttpServer())
          .get('/api/onboarding/my-applications')
          .set('Cookie', intruder.cookies)
          .expect(200);
        expect(body).toEqual([]);
      } finally {
        await cleanUp(id);
      }
    });

    it('lista las solicitudes propias', async () => {
      const customer = await registerUser();
      const id = await apply(customer);
      try {
        const { body } = await request(app.getHttpServer())
          .get('/api/onboarding/my-applications')
          .set('Cookie', customer.cookies)
          .expect(200);
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id,
          status: 'PENDING_REVIEW',
          biometricStatus: 'PENDING',
        });
      } finally {
        await cleanUp(id);
      }
    });
  });

  // ───────────────────────── Biometría ─────────────────────────

  describe('verificación biométrica', () => {
    it('verifica la identidad sin aprobar la inversión', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        const { body } = await verify(customer, id, 's0').expect(200);
        expect(body).toMatchObject({
          applicationId: id,
          attempt: 1,
          passed: true,
          status: 'PENDING_REVIEW',
          biometricStatus: 'VERIFIED',
          remainingAttempts: 2,
          failureReason: null,
          checks: { liveness: 'PASSED', faceMatch: 'MATCH' },
        });

        const { body: application } = await adminGet(id).expect(200);
        expect(application).toMatchObject({
          status: 'PENDING_REVIEW',
          biometricStatus: 'VERIFIED',
          biometricScore: body.matchScore,
        });
        expect(application.documentUrls.selfie).toBeDefined();
        await request(app.getHttpServer())
          .get(`/api/onboarding/applications/${id}/documents/selfie`)
          .set('x-admin-key', process.env.ADMIN_API_KEY!)
          .expect(200)
          .expect('Content-Type', 'image/png');

        // Ya verificada: ni otro intento ni cambiar la cédula.
        await verify(customer, id, 's0').expect(409);
        await request(app.getHttpServer())
          .post(`/api/onboarding/${id}/documents`)
          .set('Cookie', customer.cookies)
          .attach('idFront', png, 'doc.png')
          .expect(409);
      } finally {
        await cleanUp(id);
      }
    });

    it('rechaza sin verificar y deja registrado el intento', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        const { body } = await verify(customer, id, 's2').expect(200);
        expect(body).toMatchObject({
          passed: false,
          status: 'PENDING_REVIEW',
          biometricStatus: 'PENDING',
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

    it('al agotar los intentos pasa a revisión manual', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        // Tres capturas distintas que fallan, hasta consumir el límite.
        for (const suffix of ['s2', 's6']) {
          await verify(customer, id, suffix).expect(200);
        }
        const { body } = await verify(customer, id, 's10').expect(200);
        expect(body.biometricStatus).toBe('FAILED');
        await verify(customer, id, 's0').expect(429);

        const { body: application } = await adminGet(id).expect(200);
        expect(application.biometricStatus).toBe('FAILED');
      } finally {
        await cleanUp(id);
      }
    });

    it('solo el dueño puede verificar su solicitud', async () => {
      const { id } = await applicationWithDocuments();
      const intruder = await registerUser();
      try {
        await request(app.getHttpServer())
          .post(`/api/biometrics/applications/${id}/verify`)
          .send({ selfieBase64: selfie('s0') })
          .expect(401);
        await verify(intruder, id, 's0').expect(404);
      } finally {
        await cleanUp(id);
      }
    });

    it('exige los documentos antes de verificar', async () => {
      const customer = await registerUser();
      const id = await apply(customer);
      try {
        await verify(customer, id, 's0').expect(400);
      } finally {
        await cleanUp(id);
      }
    });

    it('rechaza una captura que no es una imagen', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        await request(app.getHttpServer())
          .post(`/api/biometrics/applications/${id}/verify`)
          .set('Cookie', customer.cookies)
          .send({
            selfieBase64: Buffer.from('esto no es un png').toString('base64'),
          })
          .expect(400);
      } finally {
        await cleanUp(id);
      }
    });

    it('el historial es solo para administradores', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        await request(app.getHttpServer())
          .get(`/api/biometrics/applications/${id}`)
          .expect(401);
        await request(app.getHttpServer())
          .get(`/api/biometrics/applications/${id}`)
          .set('Cookie', customer.cookies)
          .expect(403);
      } finally {
        await cleanUp(id);
      }
    });
  });

  // ───────────────────────── Revisión administrativa ─────────────────────────

  describe('aprobación de solicitudes', () => {
    it('no aprueba mientras la biometría está pendiente', async () => {
      const { id } = await applicationWithDocuments();
      try {
        await adminAction(id, 'approve').expect(409);
      } finally {
        await cleanUp(id);
      }
    });

    it('aprueba con la identidad verificada, una sola vez', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        await verify(customer, id, 's0').expect(200);
        const { body } = await adminAction(id, 'approve').expect(200);
        expect(body.status).toBe('APPROVED');
        await adminAction(id, 'reject').expect(409);
      } finally {
        await cleanUp(id);
      }
    });

    it('rechaza en cualquier momento mientras esté pendiente', async () => {
      const { id } = await applicationWithDocuments();
      try {
        const { body } = await adminAction(id, 'reject').expect(200);
        expect(body.status).toBe('REJECTED');
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
      await request(app.getHttpServer())
        .get('/api/onboarding/applications')
        .set('Cookie', cookies)
        .expect(403);
    });

    it('validan los colores y URLs de la marca', async () => {
      const server = app.getHttpServer();
      const { body: current } = await request(server)
        .get('/api/institution')
        .expect(200);
      const base = {
        institutionName: current.institutionName,
        ruc: current.ruc,
        legalRepresentative: current.legalRepresentative,
        address: current.address,
        phone: current.phone,
        email: current.email,
        disclaimerText: current.disclaimerText,
      };
      await request(server)
        .put('/api/institution')
        .set('x-admin-key', process.env.ADMIN_API_KEY!)
        .send({ ...base, primaryColor: 'red;}body{display:none' })
        .expect(400);
      await request(server)
        .put('/api/institution')
        .set('x-admin-key', process.env.ADMIN_API_KEY!)
        .send({ ...base, heroImageUrl: 'javascript:alert(1)' })
        .expect(400);
      // Sin los campos de marca se conservan los valores guardados.
      const { body } = await request(server)
        .put('/api/institution')
        .set('x-admin-key', process.env.ADMIN_API_KEY!)
        .send(base)
        .expect(200);
      expect(body.primaryColor).toBe(current.primaryColor);
    });
  });

  // ───────────────────────── Sesiones ─────────────────────────

  describe('autenticación', () => {
    it('registra, identifica y cierra la sesión', async () => {
      const server = app.getHttpServer();
      const { cookies, body, email, idNumber } = await registerUser();
      expect(body.user).toMatchObject({
        email,
        idNumber,
        fullName: 'Prueba Sesiones',
        role: 'CUSTOMER',
      });
      expect(body.user.passwordHash).toBeUndefined();

      const { body: me } = await request(server)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(me.email).toBe(email);

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

    it('rechaza el registro con un correo o una cédula repetidos', async () => {
      const { email, idNumber } = await registerUser();
      const fields = {
        firstName: 'Duplicada',
        lastName: 'Prueba',
        phone: '0991234567',
        password: 'otra-contrasena-larga',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...fields, email, idNumber: randomCedula() })
        .expect(409);
      const otherEmail = `e2e-${randomUUID()}@example.com`;
      createdEmails.push(otherEmail);
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...fields, email: otherEmail, idNumber })
        .expect(409);
    });

    it('rechaza cédulas inválidas y contraseñas de menos de 8 caracteres', async () => {
      const fields = {
        firstName: 'Corta',
        lastName: 'Prueba',
        phone: '0991234567',
        email: `e2e-${randomUUID()}@example.com`,
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...fields, idNumber: randomCedula(), password: 'corta12' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...fields,
          idNumber: '1234567890',
          password: 'contrasena-larga',
        })
        .expect(400);
    });

    it('rechaza credenciales incorrectas con el mismo error', async () => {
      const { email } = await registerUser();
      const server = app.getHttpServer();
      await request(server)
        .post('/api/auth/login')
        .send({ email, password: 'contrasena-equivocada' })
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

  // ───────────────────────── Recuperación biométrica ─────────────────────────

  describe('recuperación de clave por biometría', () => {
    const resetVerify = (email: string, suffix: string) =>
      request(app.getHttpServer())
        .post('/api/auth/biometric-reset/verify')
        .send({ email, selfieBase64: selfie(suffix) });

    it('responde igual sin cuenta o sin verificación previa', async () => {
      const { email } = await registerUser();
      const noAccount = await resetVerify(
        `nadie-${randomUUID()}@example.com`,
        'r0',
      ).expect(401);
      const noReference = await resetVerify(email, 'r0').expect(401);
      expect(noReference.body.message).toBe(noAccount.body.message);
    });

    it('cambia la clave con un rostro que coincide y el token sirve una vez', async () => {
      const { customer, id } = await applicationWithDocuments();
      try {
        await verify(customer, id, 's0').expect(200);

        await resetVerify(customer.email, 'r7').expect(401);
        const { body } = await resetVerify(customer.email, 'r0').expect(200);
        expect(body.resetToken).toEqual(expect.any(String));

        const server = app.getHttpServer();
        await request(server)
          .post('/api/auth/biometric-reset/confirm')
          .send({ resetToken: body.resetToken, newPassword: 'clave-nueva-123' })
          .expect(204);
        await request(server)
          .post('/api/auth/biometric-reset/confirm')
          .send({ resetToken: body.resetToken, newPassword: 'otra-clave-456' })
          .expect(401);

        // Las sesiones previas quedaron revocadas y la clave nueva funciona.
        await request(server)
          .post('/api/auth/refresh')
          .set('Cookie', customer.cookies)
          .expect(401);
        await request(server)
          .post('/api/auth/login')
          .send({ email: customer.email, password: 'clave-nueva-123' })
          .expect(200);
      } finally {
        await cleanUp(id);
      }
    });

    it('rechaza un token inventado', () =>
      request(app.getHttpServer())
        .post('/api/auth/biometric-reset/confirm')
        .send({ resetToken: 'inventado', newPassword: 'clave-nueva-123' })
        .expect(401));
  });
});
