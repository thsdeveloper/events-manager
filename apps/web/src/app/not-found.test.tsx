import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import NotFound from './not-found';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('NotFound', () => {
	it('says the page does not exist, offers events, support and a route back home', () => {
		renderWithProviders(<NotFound />);

		expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
		expect(screen.getByRole('heading', { level: 1, name: 'Esta página não existe' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
		expect(screen.getByRole('link', { name: /explorar eventos/i })).toHaveAttribute('href', '/eventos');
		expect(screen.getByRole('link', { name: /fale com a gente/i })).toHaveAttribute('href', '/contato');
		expect(screen.getByText('Erro 404')).toBeInTheDocument();
	});
});
