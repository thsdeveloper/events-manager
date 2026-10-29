import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, problemResponse, renderWithProviders } from '@/test';
import TaxasPage, { metadata } from './page';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

afterEach(() => vi.unstubAllGlobals());

describe('TaxasPage', () => {
	it('is indexable with a title and description about the platform fees', () => {
		expect(metadata.title).toMatch(/taxas/i);
		expect(String(metadata.description)).toMatch(/ingresso/i);
	});

	it('renders the calculator inside the header container with a way back to becoming an organizer', () => {
		mockFetch([['/api/content/fees', () => problemResponse(500, 'INTERNAL_ERROR')]]);

		const { container } = renderWithProviders(<TaxasPage />);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/taxas/i);
		expect(screen.getByLabelText(/valor do ingresso/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /quero vender ingressos/i })).toHaveAttribute(
			'href',
			'/perfil/organizador',
		);
		const wrapper = container.querySelector('.max-w-7xl');
		expect(wrapper?.className).toMatch(/\bpx-4\b/);
	});

	it('decorates the page with illustrations that stay invisible to assistive technology', () => {
		mockFetch([['/api/content/fees', () => problemResponse(500, 'INTERNAL_ERROR')]]);

		const { container } = renderWithProviders(<TaxasPage />);

		const illustrations = Array.from(container.querySelectorAll('img[src^="/images/fees/"]'));
		expect(illustrations.map((img) => img.getAttribute('src'))).toEqual([
			'/images/fees/growth.webp',
			'/images/fees/calculator.webp',
			'/images/fees/buyer.webp',
			'/images/fees/team.webp',
		]);
		for (const img of illustrations) {
			expect(img).toHaveAttribute('alt', '');
			expect(img).toHaveAttribute('aria-hidden', 'true');
			// Dimensões declaradas: a página não pula quando a imagem carrega.
			expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
			expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
		}
	});

	it('explains the fee in three steps and how the audience can pay', () => {
		mockFetch([['/api/content/fees', () => problemResponse(500, 'INTERNAL_ERROR')]]);

		renderWithProviders(<TaxasPage />);

		const steps = screen.getByRole('list', { name: /como a taxa funciona/i });
		expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
		expect(within(steps).getByText(/defina o preço/i)).toBeInTheDocument();
		expect(within(steps).getByText(/quem paga a taxa/i)).toBeInTheDocument();
		expect(within(steps).getByText('Receba na sua chave PIX')).toBeInTheDocument();

		const buyers = screen.getByRole('region', { name: /para quem compra/i });
		expect(within(buyers).getByText(/até 12 vezes/i)).toBeInTheDocument();
		expect(within(buyers).getByText(/boleto/i)).toBeInTheDocument();
	});
});
