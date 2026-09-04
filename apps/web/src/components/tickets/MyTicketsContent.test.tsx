import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { MyTicketsContent } from './MyTicketsContent';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('MyTicketsContent', () => {
	it('invites the person to explore events when there are no tickets yet', () => {
		renderWithProviders(<MyTicketsContent registrations={[]} />);

		expect(screen.getByRole('heading', { name: 'Nenhum ingresso por aqui' })).toBeInTheDocument();
		expect(screen.getByText(/quando você comprar um ingresso/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /explorar eventos/i })).toHaveAttribute('href', '/eventos');
	});
});
