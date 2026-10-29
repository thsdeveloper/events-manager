import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { EventsEmptyState } from './EventsEmptyState';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('EventsEmptyState', () => {
	it('invites the organizer to create the first event, with the calendar illustration', () => {
		const { container } = renderWithProviders(<EventsEmptyState />);

		expect(screen.getByRole('heading', { name: 'Nenhum evento criado ainda' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /criar primeiro evento/i })).toHaveAttribute('href', '/admin/eventos/novo');
		expect(container.querySelector('img[aria-hidden="true"]')).toHaveAttribute('src', '/images/empty/events.svg');
	});
});
