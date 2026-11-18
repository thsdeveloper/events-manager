import { renderAsOwner, TestPermissions, ownerAccess } from '@/test/permissions';
import { renderWithProviders, jsonResponse, mockFetch, problemResponse } from '@/test';
/**
 * Cabeçalho do detalhe do evento. As ações do evento ficam juntas no topo,
 * inclusive a exclusão, que abre a confirmação antes de qualquer chamada.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { Event } from '@events-manager/contracts';
import EventoDetalhesClient from './EventoDetalhesClient';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
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
	it('hides mutation and financial controls from a check-in operator', () => {
		renderWithProviders(
			<TestPermissions
				access={{
					...ownerAccess,
					isOwner: false,
					permissions: ['events.read', 'participants.read', 'checkin.execute'],
				}}
			>
				<EventoDetalhesClient initialEvent={event} evento_id="e-1" />
			</TestPermissions>,
		);
		expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
		expect(screen.queryByText('Receita bruta')).not.toBeInTheDocument();
		expect(screen.queryByRole('tab', { name: 'Ingressos' })).not.toBeInTheDocument();
	});
	it('keeps "Excluir" among the header actions, beside "Editar", not buried in the details tab', () => {
		renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

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
		const { user } = renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

		await user.click(screen.getByRole('button', { name: 'Excluir' }));

		expect(screen.getByRole('alertdialog', { name: 'Excluir evento' })).toBeInTheDocument();
	});

	it('offers "Publicar" in the header only while the event is a draft', () => {
		const { unmount } = renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);
		const actions = screen.getByRole('toolbar', { name: 'Ações do evento' });
		expect(within(actions).getByRole('button', { name: 'Publicar' })).toBeInTheDocument();
		unmount();

		renderAsOwner(<EventoDetalhesClient initialEvent={{ ...event, status: 'published' } as Event} evento_id="e-1" />);
		expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
	});

	it('publishes only after the organizer confirms, then refreshes the page', async () => {
		const fetchMock = mockFetch([['/api/events/e-1', () => jsonResponse({ ...event, status: 'published' })]]);
		const { user } = renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

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
		const { user } = renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);

		await user.click(screen.getByRole('button', { name: 'Publicar' }));
		await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Publicar' }));

		expect(await screen.findByText('Cadastre ao menos um ingresso.')).toBeInTheDocument();
		expect(router.refresh).not.toHaveBeenCalled();
	});

	it('shows the rich description as formatted text, never as raw tags', () => {
		renderAsOwner(
			<EventoDetalhesClient
				initialEvent={{ ...event, description: '<p>Três dias de <strong>encontros</strong>.</p>' } as Event}
				evento_id="e-1"
			/>,
		);

		expect(screen.getByText('encontros')).toBeInTheDocument();
		expect(screen.queryByText(/<strong>/)).not.toBeInTheDocument();
	});
});

describe('prévia e retirada do ar', () => {
	it('links a draft to its private preview', () => {
		renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);
		expect(screen.getByRole('link', { name: /Prévia/ })).toHaveAttribute('href', '/admin/eventos/e-1/previa');
	});
	it('unpublishes only after confirmation', async () => {
		const requests = mockFetch([['/api/events/e-1', () => jsonResponse({ ...event, status: 'draft' })]]);
		const { user } = renderAsOwner(
			<EventoDetalhesClient initialEvent={{ ...event, status: 'published' } as Event} evento_id="e-1" />,
		);
		await user.click(screen.getByRole('button', { name: 'Despublicar' }));
		expect(requests.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
		await user.click(
			within(screen.getByRole('alertdialog', { name: 'Despublicar evento' })).getByRole('button', {
				name: 'Despublicar',
			}),
		);
		await waitFor(() =>
			expect(requests).toHaveBeenCalledWith('/api/events/e-1', expect.objectContaining({ method: 'PATCH' })),
		);
		const call = requests.mock.calls.find(([, init]) => init?.method === 'PATCH');
		expect(JSON.parse(String(call?.[1]?.body))).toEqual({ status: 'draft' });
	});
});

it('separates confirmed sales, reservations and paid revenue', () => {
	const initialEvent = {
		...event,
		tickets: [{ id: 't-1', quantity: 10, quantity_sold: 3, price: 100 }],
		registrations: [
			{
				id: 'r-1',
				status: 'pending',
				payment_status: 'pending',
				quantity: 2,
				payment_amount: 200,
				inventory_reserved: true,
			},
			{ id: 'r-2', status: 'confirmed', payment_status: 'paid', quantity: 1, payment_amount: 100 },
		],
	} as unknown as Event;
	renderAsOwner(<EventoDetalhesClient initialEvent={initialEvent} evento_id="e-1" />);
	expect(within(screen.getByRole('group', { name: 'Ingressos vendidos' })).getByText('1')).toBeInTheDocument();
	expect(within(screen.getByRole('group', { name: 'Reservados' })).getByText('2')).toBeInTheDocument();
	expect(within(screen.getByRole('group', { name: 'Receita bruta' })).getByText(/100,00/)).toBeInTheDocument();
});

it('atualiza o contexto do Header ao excluir o evento selecionado', async () => {
	router.push.mockClear();
	router.refresh.mockClear();
	mockFetch([['/api/events/e-1', () => new Response(null, { status: 204 })]]);
	const { user } = renderAsOwner(<EventoDetalhesClient initialEvent={event} evento_id="e-1" />);
	await user.click(screen.getByRole('button', { name: 'Excluir' }));
	await user.click(
		within(screen.getByRole('alertdialog', { name: 'Excluir evento' })).getByRole('button', { name: 'Excluir evento' }),
	);
	await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/eventos'));
	expect(router.refresh).toHaveBeenCalledOnce();
});
