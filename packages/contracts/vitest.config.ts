import { defineConfig } from 'vitest/config';

/**
 * Os contratos são a fonte de verdade de validação compartilhada entre API e
 * web. Cada regra de negócio expressa em um schema Zod nasce aqui de um teste.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/database.types.ts', 'src/index.ts'],
		},
	},
});
