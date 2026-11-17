import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { mockFetch, jsonResponse, renderWithProviders } from '@/test';
import { EventDraftList } from './EventDraftList';
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
it('lists saved snapshots and resumes them without listing converted events', async () => {
	mockFetch([
		[
			'/api/event-drafts',
			() =>
				jsonResponse({
					data: [
						{ id: 'draft-1', values: { title: 'Encontro futuro' }, current_step: 2 },
						{ id: 'draft-2', values: { title: 'Já convertido' }, current_step: 6, event_id: 'event-1' },
					],
				}),
		],
	]);
	renderWithProviders(<EventDraftList enabled />);
	expect(await screen.findByText('Encontro futuro')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Retomar rascunho' })).toHaveAttribute(
		'href',
		'/admin/eventos/novo?rascunho=draft-1',
	);
	expect(screen.queryByText('Já convertido')).not.toBeInTheDocument();
});
it('uses the preparation area for pending organizers', async () => {
	mockFetch([['/api/event-drafts', () => jsonResponse({ data: [{ id: 'draft-1', values: {}, current_step: 0 }] })]]);
	renderWithProviders(<EventDraftList enabled resumePath="/perfil/organizador/rascunhos" />);
	expect(await screen.findByRole('link', { name: 'Retomar rascunho' })).toHaveAttribute(
		'href',
		'/perfil/organizador/rascunhos?rascunho=draft-1',
	);
});
it('recovers from a failed listing through retry', async () => {
	let calls = 0;
	mockFetch([
		[
			'/api/event-drafts',
			() =>
				++calls === 1
					? new Response(JSON.stringify({ detail: 'Falha temporária' }), { status: 503 })
					: jsonResponse({ data: [{ id: 'd-1', values: { title: 'Recuperado' }, current_step: 0 }] }),
		],
	]);
	const { user } = renderWithProviders(<EventDraftList enabled />);
	await user.click(await screen.findByRole('button', { name: 'Carregar rascunhos novamente' }));
	expect(await screen.findByText('Recuperado')).toBeInTheDocument();
});
