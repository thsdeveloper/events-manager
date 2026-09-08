import { defineConfig } from 'vitest/config';

/**
 * Configuração de testes da API.
 *
 * - `test/**` guarda os testes existentes (unitários, de rota e de arquitetura).
 * - `src/**\/*.test.ts` permite testes colocados ao lado do código quando o
 *   ciclo TDD favorece proximidade (regra de negócio pequena e isolada).
 * - A cobertura é medida sobre `src/application` e `src/routes`, as camadas
 *   que carregam regra de negócio e contrato HTTP. Infraestrutura Supabase é
 *   coberta por testes com clientes falsos apenas onde há lógica própria.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
		exclude: ['dist/**', 'node_modules/**'],
		clearMocks: true,
		restoreMocks: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			reportsDirectory: './coverage',
			include: ['src/application/**/*.ts', 'src/routes/**/*.ts', 'src/shared/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/index.ts'],
			// Catraca: os valores refletem a cobertura medida em 2026-09-05 e só
			// podem subir. Ao cobrir um módulo, eleve o limiar correspondente.
			thresholds: {
				lines: 55,
				functions: 61,
				branches: 80,
				statements: 55,
			},
		},
	},
});
