/**
 * Cabeçalho do detalhe do evento. As ações do evento ficam juntas no topo,
 * inclusive a exclusão, que abre a confirmação antes de qualquer chamada.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { Event } from '@events-manager/contracts';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import EventoDetalhesClient from './EventoDetalhesClient';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const event = {
	id: 'e-1',
	title: 'Congresso',
	slug: 'congresso',
	status: 'draft',
	is_free: false,
	start_date: '2026-09-19T12:00:00.000Z',
	end_date: '2026-09-21T21:00:00.000Z',
	event_type: 'in_person',
	tickets: [],
	registrations: [],
} as unknown as Event;

describe('EventoDetalhesClient', () => {
	it('keeps "Excluir" among the header actions, beside "Editar", not buried in the details tab', () => {
		renderWithProviders(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

		const actions = screen.getByRole('toolbar', { name: 'Ações do evento' });
		expect(within(actions).getByRole('link', { name: /editar/i })).toBeInTheDocument();
		expect(within(actions).getByRole('link', { name: 'Página do evento' })).toHaveAttribute(
			'href',
			'/admin/eventos/e-1/pagina',
		);
		expect(within(actions).getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /excluir/i })).toHaveLength(1);
	});

	it('asks for confirmation before deleting', async () => {
		const { user } = renderWithProviders(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

		await user.click(screen.getByRole('button', { name: 'Excluir' }));

		expect(screen.getByRole('alertdialog', { name: 'Excluir evento' })).toBeInTheDocument();
	});

	it('offers "Publicar" in the header only while the event is a draft', () => {
		const { unmount } = renderWithProviders(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);
		const actions = screen.getByRole('toolbar', { name: 'Ações do evento' });
		expect(within(actions).getByRole('button', { name: 'Publicar' })).toBeInTheDocument();
		unmount();

		renderWithProviders(
			<EventoDetalhesClient initialEvent={{ ...event, status: 'published' } as Event} evento_id="e-1" />,
		);
		expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
	});

	it('publishes only after the organizer confirms, then refreshes the page', async () => {
		const fetchMock = mockFetch([['/api/events/e-1', () => jsonResponse({ ...event, status: 'published' })]]);
		const { user } = renderWithProviders(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

		await user.click(screen.getByRole('button', { name: 'Publicar' }));
		const dialog = screen.getByRole('alertdialog', { name: 'Publicar evento' });
		const patchCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
		expect(patchCalls()).toHaveLength(0);

		await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));

		await waitFor(() => expect(patchCalls()).toHaveLength(1));
		const [url, init] = patchCalls()[0];
		expect(url).toBe('/api/events/e-1');
		expect(JSON.parse(String(init?.body))).toEqual({ status: 'published' });
		await waitFor(() => expect(router.refresh).toHaveBeenCalled());
	});

	it('keeps the dialog open and shows why when the API refuses to publish', async () => {
		mockFetch([['/api/events/e-1', () => problemResponse(422, 'VALIDATION_ERROR', 'Cadastre ao menos um ingresso.')]]);
		const { user } = renderWithProviders(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

		await user.click(screen.getByRole('button', { name: 'Publicar' }));
		await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Publicar' }));

		expect(await screen.findByText('Cadastre ao menos um ingresso.')).toBeInTheDocument();
		expect(router.refresh).not.toHaveBeenCalled();
	});

	it('shows the rich description as formatted text, never as raw tags', () => {
		renderWithProviders(
			<EventoDetalhesClient
				initialEvent={{ ...event, description: '<p>Três dias de <strong>encontros</strong>.</p>' } as Event}
				evento_id="e-1"
			/>,
		);

		expect(screen.getByText('encontros')).toBeInTheDocument();
		expect(screen.queryByText(/<strong>/)).not.toBeInTheDocument();
	});
});
