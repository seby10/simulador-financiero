import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // BD remota (Neon): cada consulta cuesta un viaje de ida y vuelta (~170 ms
    // desde Ecuador) y la instancia puede arrancar en frío. Los archivos subidos
    // también viven en la base, así que un caso con varios documentos encadena
    // bastantes. En producción la API y la base comparten región y esto baja a
    // milisegundos: el margen es para el desarrollo, no una medida real.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
