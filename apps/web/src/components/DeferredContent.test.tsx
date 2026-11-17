import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { DeferredContent } from './DeferredContent';
const originalObserver = window.IntersectionObserver;
afterEach(() => {
	window.IntersectionObserver = originalObserver;
});
describe('DeferredContent', () => {
	it('loads expensive content when it approaches the viewport and keeps it mounted afterward', async () => {
		let intersect: IntersectionObserverCallback = () => {};
		const disconnect = vi.fn();
		window.IntersectionObserver = class {
			constructor(callback: IntersectionObserverCallback) {
				intersect = callback;
			}
			observe() {}
			disconnect = disconnect;
		} as unknown as typeof IntersectionObserver;
		renderWithProviders(
			<DeferredContent fallback={<p role="status">Carregando gráfico</p>}>
				<h2>Vendas do mês</h2>
			</DeferredContent>,
		);
		expect(screen.getByRole('status')).toHaveTextContent('Carregando gráfico');
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
		act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
		expect(await screen.findByRole('heading', { name: 'Vendas do mês' })).toBeInTheDocument();
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
		expect(screen.getByRole('heading')).toBeInTheDocument();
		expect(disconnect).toHaveBeenCalled();
	});
	it('still displays the content in browsers without IntersectionObserver', async () => {
		window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;
		renderWithProviders(
			<DeferredContent fallback="Carregando">
				<h2>Vendas do mês</h2>
			</DeferredContent>,
		);
		await waitFor(() => expect(screen.getByRole('heading')).toBeInTheDocument());
	});
});
