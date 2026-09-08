import { screen } from '@testing-library/react';
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
});
