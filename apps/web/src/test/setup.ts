/**
 * Setup do projeto `dom` (jsdom). Carregado antes de cada arquivo `*.test.tsx`.
 *
 * - Matchers do jest-dom (`toBeInTheDocument`, `toHaveTextContent`, ...).
 * - Limpeza automática do DOM entre testes.
 * - Stubs mínimos de APIs de navegador que o jsdom não implementa e que
 *   componentes Radix/Tailwind consultam durante a montagem.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// O Next roda o App Router em Strict Mode durante o desenvolvimento: efeitos
// são executados duas vezes na montagem. Os testes reproduzem essa condição
// para que um efeito que só funciona na primeira execução (ler e limpar um
// token da URL, por exemplo) falhe aqui e não só no navegador de quem
// desenvolve. Precisa ser a opção do Testing Library: um <StrictMode> dentro
// do elemento renderizado com `wrapper` não duplica os efeitos.
configure({ reactStrictMode: true });

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

	// motion/react `useInView` (ícones animados ao entrar na tela) precisa de
	// IntersectionObserver, que o jsdom não implementa. O stub nunca dispara:
	// nos testes, os ícones ficam no estado inicial.
	if (!('IntersectionObserver' in window)) {
		class IntersectionObserverStub {
			readonly root = null;
			readonly rootMargin = '0px';
			readonly thresholds = [0];
			observe() {}
			unobserve() {}
			disconnect() {}
			takeRecords() {
				return [];
			}
		}
		Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IntersectionObserverStub });
	}

	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = vi.fn();
	}
}
