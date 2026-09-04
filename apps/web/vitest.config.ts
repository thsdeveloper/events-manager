import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Dois projetos de teste, escolhidos pelo nome do arquivo:
 *
 * - `unit` (ambiente Node): `*.test.ts` para funções puras, schemas e
 *   utilitários, e `*.ssr.test.tsx` para renderização no servidor sem DOM.
 * - `dom` (ambiente jsdom + Testing Library): `*.test.tsx` para componentes,
 *   hooks e fluxos de interação do usuário.
 *
 * Testes de página completa e navegação real ficam no Playwright (E2E), fora
 * do Vitest.
 */
const srcAlias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
	esbuild: { jsx: 'automatic' },
	resolve: { alias: srcAlias },
	test: {
		clearMocks: true,
		restoreMocks: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			reportsDirectory: './coverage',
			include: ['src/lib/**', 'src/hooks/**', 'src/features/**', 'src/components/**'],
			exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/components/ui/**', 'src/components/animate-ui/**'],
			// Catraca: valores medidos em 2026-09-04 (todos os arquivos do `include`
			// contam, cobertos ou não). Só podem subir; eleve ao cobrir um módulo.
			thresholds: {
				lines: 4,
				functions: 75,
				branches: 70,
				statements: 4,
			},
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts', 'src/**/*.ssr.test.tsx'],
				},
			},
			{
				extends: true,
				test: {
					name: 'dom',
					environment: 'jsdom',
					include: ['src/**/*.test.tsx'],
					exclude: ['src/**/*.ssr.test.tsx', '**/node_modules/**'],
					setupFiles: ['./src/test/setup.ts'],
				},
			},
		],
	},
});
