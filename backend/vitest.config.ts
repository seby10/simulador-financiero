import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      include: [
        'src/common/math/**/*.ts',
        'src/common/validation/**/*.ts',
        'src/common/auth.ts',
        'src/common/tokens.ts',
        'src/modules/auth/password.ts',
      ],
      exclude: ['**/*.spec.ts'],
      thresholds: { 100: true },
    },
  },
});
