import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { writeFile } from 'node:fs/promises';
import { AppModule } from './app.module.js';
import {
  ACCESS_COOKIE,
  ADMIN_KEY_HEADER,
  ADMIN_SECURITY,
  SESSION_SECURITY,
} from './common/auth.js';
import { corsOrigins, csrfOrigin } from './common/csrf.js';

try {
  process.loadEnvFile();
} catch {
  // sin .env: variables provistas por el entorno
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // /uploads queda fuera del prefijo: las URLs guardadas en la base ya apuntan
  // ahí y las sirve UploadsController leyendo de Postgres.
  app.setGlobalPrefix('api', { exclude: ['uploads/:folder/:name'] });
  // El frontend reenvía /api con un proxy local (rewrites de Next o nginx): sin
  // confiar en él, request.ip sería 127.0.0.1 para todos y el límite por IP
  // castigaría a todos los usuarios a la vez.
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
  app.use(
    helmet({
      // Solo sirve JSON, archivos y Swagger UI (que usa scripts inline).
      contentSecurityPolicy: false,
      // Logos e imágenes de /uploads se muestran desde el dominio del frontend.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    origin: corsOrigins(),
    // Las cookies de sesión solo viajan si el navegador tiene permiso explícito.
    credentials: true,
  });
  // Capturas faciales en base64 superan el límite por defecto (100 kb).
  app.useBodyParser('json', { limit: '8mb' });
  app.use(cookieParser());
  // Después de cookieParser: decide según las cookies de sesión de la petición.
  app.use(csrfOrigin);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Simulador Financiero API')
      .setDescription(
        'Simulación de créditos (Francés/Alemán), pólizas a plazo fijo y onboarding digital. ' +
          'Montos y tasas viajan como string decimal; las tasas están en porcentaje. ' +
          'La sesión se gestiona con cookies httpOnly emitidas por `/api/auth`. ' +
          `Las rutas administrativas aceptan una sesión con rol ADMIN o la cabecera \`${ADMIN_KEY_HEADER}\`.`,
      )
      .setVersion('1.1.0')
      .addApiKey(
        { type: 'apiKey', in: 'header', name: ADMIN_KEY_HEADER },
        ADMIN_SECURITY,
      )
      .addCookieAuth(ACCESS_COOKIE, { type: 'apiKey' }, SESSION_SECURITY)
      .build(),
  );

  // npm run openapi → escribe openapi.json sin levantar el servidor.
  if (process.argv.includes('--export-openapi')) {
    await writeFile('openapi.json', JSON.stringify(openApi, null, 2) + '\n');
    await app.close();
    return;
  }

  // UI en /api/docs, JSON en /api/docs-json.
  // withCredentials: sin esto "Try it out" no adjunta las cookies de sesión.
  SwaggerModule.setup('api/docs', app, openApi, {
    swaggerOptions: { withCredentials: true },
  });
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
await bootstrap();
