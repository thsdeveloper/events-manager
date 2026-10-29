import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import NotFound from './not-found';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('NotFound', () => {
	it('says the page does not exist, shows the 404 illustration and leads back home', () => {
		const { container } = renderWithProviders(<NotFound />);

		expect(screen.getByRole('heading', { level: 1, name: 'Esta página não existe' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
		const img = container.querySelector('img[aria-hidden="true"]');
		expect(img).toHaveAttribute('src', '/images/empty/not-found.svg');
		expect(img).toHaveAttribute('alt', '');
	});
});
