import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import type { Event } from '@events-manager/contracts';
import { EventsTable } from './EventsTable';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
const data = [
	{
		event: {
			id: 'e1',
			title: 'Evento publicado',
			status: 'published',
			event_type: 'online',
			is_free: true,
			featured: true,
		} as Event,
		participantsCount: 0,
	},
	{
		event: {
			id: 'e2',
			title: 'Evento rascunho',
			status: 'draft',
			event_type: 'in_person',
			is_free: false,
			featured: false,
		} as Event,
		participantsCount: 0,
	},
];
it('filters the table only after applying and restores all events when filters are cleared', async () => {
	const { user } = renderWithProviders(<EventsTable data={data} />);
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	await user.click(screen.getByRole('checkbox', { name: 'Publicado' }));
	await user.click(screen.getByRole('checkbox', { name: 'Online' }));
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(screen.getByRole('link', { name: 'Evento publicado' })).toBeInTheDocument();
	expect(screen.queryByRole('link', { name: 'Evento rascunho' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(screen.getByRole('link', { name: 'Evento rascunho' })).toBeInTheDocument();
});
