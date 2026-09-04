/**
 * Setup do projeto `dom` (jsdom). Carregado antes de cada arquivo `*.test.tsx`.
 *
 * - Matchers do jest-dom (`toBeInTheDocument`, `toHaveTextContent`, ...).
 * - Limpeza automática do DOM entre testes.
 * - Stubs mínimos de APIs de navegador que o jsdom não implementa e que
 *   componentes Radix/Tailwind consultam durante a montagem.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
	cleanup();
});

if (typeof window !== 'undefined') {
	if (!window.matchMedia) {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	}

	if (!('ResizeObserver' in window)) {
		class ResizeObserverStub {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub });
	}

	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = vi.fn();
	}
}
