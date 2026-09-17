import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFile } from 'node:fs/promises';
import { AppModule } from './app.module.js';
import { ADMIN_KEY_HEADER, ADMIN_SECURITY } from './common/auth.js';
import { PUBLIC_UPLOADS } from './common/http.js';

try {
  process.loadEnvFile();
} catch {
  // sin .env: variables provistas por el entorno
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
  });
  // Capturas faciales en base64 superan el límite por defecto (100 kb).
  app.useBodyParser('json', { limit: '8mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useStaticAssets(PUBLIC_UPLOADS, { prefix: '/uploads/' });
  app.enableShutdownHooks();

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Simulador Financiero API')
      .setDescription(
        'Simulación de créditos (Francés/Alemán), pólizas a plazo fijo y onboarding digital. ' +
          'Montos y tasas viajan como string decimal; las tasas están en porcentaje. ' +
          `Las rutas administrativas requieren la cabecera \`${ADMIN_KEY_HEADER}\`.`,
      )
      .setVersion('1.0.0')
      .addApiKey(
        { type: 'apiKey', in: 'header', name: ADMIN_KEY_HEADER },
        ADMIN_SECURITY,
      )
      .build(),
  );

  // npm run openapi → escribe openapi.json sin levantar el servidor.
  if (process.argv.includes('--export-openapi')) {
    await writeFile('openapi.json', JSON.stringify(openApi, null, 2) + '\n');
    await app.close();
    return;
  }

  // UI en /api/docs, JSON en /api/docs-json
  SwaggerModule.setup('api/docs', app, openApi);
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
