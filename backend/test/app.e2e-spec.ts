import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

// Requiere DATABASE_URL con migraciones y seed aplicados.
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.loadEnvFile();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
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
  });
});
