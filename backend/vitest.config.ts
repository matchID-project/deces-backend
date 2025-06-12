import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclure temporairement les tests qui nécessitent Redis/Elasticsearch
      '**/processStream.spec.ts',
      '**/bulk.spec.ts',
      '**/search.spec.ts'
    ]
  }
});