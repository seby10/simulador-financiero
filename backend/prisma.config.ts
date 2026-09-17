import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // ponytail: sin .env se usan las variables del entorno (CI / producción)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // CLI usa conexión directa: el pooler de Neon no soporta advisory locks de migrate.
  datasource: { url: env('DIRECT_URL') },
});
