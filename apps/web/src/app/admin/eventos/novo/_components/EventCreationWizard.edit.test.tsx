/**
 * Editar um evento usa o mesmo assistente em etapas da criação: mesma ordem,
 * mesmos campos, mesma barra de progresso. O que muda é o ponto de partida
 * (o evento guardado), a liberdade de ir a qualquer etapa e o envio, que
 * atualiza o evento em vez de criar outro.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { Event } from '@events-manager/contracts';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { resetServerAuthStore } from '@/hooks/useServerAuth';
import { EventCreationWizard } from './EventCreationWizard';

beforeEach(() => {
	resetServerAuthStore();
	window.localStorage.removeItem('event-creation-wizard');
});

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/admin/AIImageGenerationModal', () => ({ AIImageGenerationModal: () => null }));

const CATEGORY_ID = '00000000-0000-4000-8000-000000000050';

const event = {
	id: 'e-1',
	title: 'Congresso de Jovens da ADEB',
	slug: 'congresso',
	status: 'draft',
	short_description: 'Encontro anual.',
	description:
		'<p>Três dias de encontros, oficinas e celebrações para a juventude da igreja, com convidados de todo o país.</p>',
	tags: ['jovens'],
	start_date: '2026-09-19T12:00:00.000Z',
	end_date: '2026-09-21T21:00:00.000Z',
	event_type: 'online',
	online_url: 'https://meet.example.com/congresso',
	is_free: true,
	featured: false,
	category_id: { id: CATEGORY_ID, name: 'Religioso', slug: 'religioso' },
	cover_image: null,
	tickets: [{ id: 't-1', title: 'Inteira', price: 100, quantity: 10 }],
} as unknown as Event;

function renderEdit() {
	const fetchMock = mockFetch([
		['/api/event-categories', () => jsonResponse({ data: [{ id: CATEGORY_ID, name: 'Religioso' }] })],
		['/api/organizer/profile', () => jsonResponse({ id: 'org-1', name: 'ADEB', status: 'active' })],
		['/api/events/e-1', () => jsonResponse({ ...event, title: 'Congresso de Jovens da ADEB' })],
	]);

	return { fetchMock, ...renderWithProviders(<EventCreationWizard mode="edit" event={event} />) };
}

describe('EventCreationWizard em modo de edição', () => {
	it('lets the organizer choose an unlisted event and saves that choice', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');
		await user.click(screen.getByRole('button', { name: /^Ingressos:/ }));
		await user.click(screen.getByRole('radio', { name: /Não listado/ }));
		await user.click(screen.getByRole('button', { name: /^Revisão:/ }));
		expect(screen.getByText('Não listado — acesso pelo link')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/events/e-1', expect.objectContaining({ method: 'PATCH' })),
		);
		const call = fetchMock.mock.calls.find(([url, init]) => url === '/api/events/e-1' && init?.method === 'PATCH');
		expect(JSON.parse(String(call?.[1]?.body))).toHaveProperty('visibility', 'unlisted');
	});

	it('starts from the stored event and lets the organizer jump straight to any step', async () => {
		const { user } = renderEdit();

		expect(await screen.findByDisplayValue('Congresso de Jovens da ADEB')).toBeInTheDocument();
		const steps = screen.getByRole('list').closest('nav') ?? document.body;
		const detailsStep = within(steps).getByRole('button', { name: /^Detalhes:/ });
		expect(detailsStep).toBeEnabled();

		await user.click(detailsStep);

		expect(await screen.findByRole('textbox', { name: 'Descrição completa' })).toHaveTextContent(/Três dias/);
	});

	it('ignores the creation draft kept in the browser, so an old draft never overwrites the event', async () => {
		window.localStorage.setItem(
			'event-creation-wizard',
			JSON.stringify({ formData: { title: 'Rascunho antigo de outro evento' }, meta: { currentStep: 3 } }),
		);
		renderEdit();

		expect(await screen.findByDisplayValue('Congresso de Jovens da ADEB')).toBeInTheDocument();
		expect(screen.queryByDisplayValue('Rascunho antigo de outro evento')).not.toBeInTheDocument();
		window.localStorage.removeItem('event-creation-wizard');
	});

	it('leaves ticket types to the event page and does not send them when saving', async () => {
		const { user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');

		await user.click(screen.getByRole('button', { name: /^Ingressos:/ }));

		expect(screen.queryByRole('button', { name: /adicionar ingresso/i })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /gerenciar ingressos/i })).toHaveAttribute('href', '/admin/eventos/e-1');
	});

	it('saves the changes on the event itself and returns to its page', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');

		await user.click(screen.getByRole('button', { name: /^Revisão:/ }));
		await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/events/e-1', expect.objectContaining({ method: 'PATCH' })),
		);
		const call = fetchMock.mock.calls.find(([url, init]) => url === '/api/events/e-1' && init?.method === 'PATCH');
		const body = JSON.parse(String(call?.[1]?.body));
		expect(body).toMatchObject({
			title: 'Congresso de Jovens da ADEB',
			category_id: CATEGORY_ID,
			event_type: 'online',
			is_free: true,
			tags: ['jovens'],
		});
		expect(body).not.toHaveProperty('tickets');
		expect(body).not.toHaveProperty('slug');
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/eventos/e-1'));
	});

	it('offers "Salvar" in the footer from any step, saving without walking to the review', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');

		await user.click(screen.getByRole('button', { name: 'Salvar' }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/events/e-1', expect.objectContaining({ method: 'PATCH' })),
		);
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/eventos/e-1'));
	});

	it('takes the organizer to the step with the problem when a quick save fails validation', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');

		await user.click(screen.getByRole('button', { name: /^Detalhes:/ }));
		const editor = await screen.findByRole('textbox', { name: 'Descrição completa' });
		await user.click(editor);
		await user.keyboard('{Control>}a{/Control}{Backspace}');
		await user.click(screen.getByRole('button', { name: /^Básico:/ }));
		expect(await screen.findByDisplayValue('Congresso de Jovens da ADEB')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Salvar' }));

		expect(await screen.findByRole('button', { name: /^Detalhes:/ })).toHaveAttribute('aria-current', 'step');
		expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
	});
});

describe('EventCreationWizard em modo de criação', () => {
	it('holds a paid ticket in the draft until the organizer finishes the event review', async () => {
		window.localStorage.setItem(
			'event-creation-wizard',
			JSON.stringify({
				formData: {
					...event,
					category_id: CATEGORY_ID,
					cover_image: '',
					tags: [],
					tickets: [],
					is_free: false,
					visibility: 'unlisted',
					status: 'published',
					publish_after_create: false,
				},
				meta: { currentStep: 5 },
			}),
		);
		const fetchMock = mockFetch([
			['/api/auth/me', () => jsonResponse({ user: { id: 'u-1', email: 'organizer@example.com' } })],
			['/api/event-categories', () => jsonResponse({ data: [{ id: CATEGORY_ID, name: 'Religioso' }] })],
			['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-1', status: 'active' } })],
			[
				'/api/content/fees',
				() => jsonResponse({ platform_fee_percentage: 5, card_fee_percentage: 3.5, card_fee_fixed: 0.6 }),
			],
			['/api/events', () => jsonResponse({ id: 'new-event', status: 'published' })],
		]);
		const { user } = renderWithProviders(<EventCreationWizard />);
		await user.click(await screen.findByRole('button', { name: 'Adicionar ingresso' }));
		const dialog = await screen.findByRole('dialog', { name: 'Novo ingresso' });
		await user.type(within(dialog).getByRole('textbox', { name: /Nome do ingresso/ }), 'Lote 1');
		const price = within(dialog).getByRole('spinbutton', { name: /Valor do ingresso/ });
		await user.clear(price);
		await user.type(price, '50');
		await user.click(within(dialog).getByRole('checkbox', { name: /Permitir parcelamento/ }));
		await user.type(within(dialog).getByRole('spinbutton', { name: /Máximo de parcelas/ }), '3');
		await user.click(within(dialog).getByRole('button', { name: 'Adicionar ingresso' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo ingresso' })).not.toBeInTheDocument());
		expect(screen.getByText('Lote 1')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Ingressos:/ })).toHaveAttribute('aria-current', 'step');
		expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
		await user.click(screen.getByRole('button', { name: 'Continuar' }));
		await user.click(await screen.findByRole('button', { name: 'Criar evento' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' })),
		);
		const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
		expect(writes).toHaveLength(1);
		const body = JSON.parse(String(writes[0][1]?.body));
		expect(body).toMatchObject({
			visibility: 'unlisted',
			is_free: false,
			tickets: [{ title: 'Lote 1', price: 50, quantity: 100, allow_installments: true, max_installments: 3 }],
		});
		expect(body.tickets[0]).not.toHaveProperty('clientId');
		expect(body.tickets[0]).not.toHaveProperty('event_id');
	});

	it('creates an unlisted event from its reviewed draft', async () => {
		window.localStorage.setItem(
			'event-creation-wizard',
			JSON.stringify({
				formData: {
					...event,
					category_id: CATEGORY_ID,
					cover_image: '',
					tickets: [],
					visibility: 'unlisted',
					tags: [],
					status: 'published',
					publish_after_create: false,
				},
				meta: { currentStep: 6 },
			}),
		);
		const fetchMock = mockFetch([
			['/api/auth/me', () => jsonResponse({ user: { id: 'u-1', email: 'organizer@example.com' } })],
			['/api/event-categories', () => jsonResponse({ data: [{ id: CATEGORY_ID, name: 'Religioso' }] })],
			['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-1', status: 'active' } })],
			['/api/events', () => jsonResponse({ id: 'new-event', status: 'published' })],
		]);
		const { user } = renderWithProviders(
			<>
				<EventCreationWizard />
				<Toaster />
			</>,
		);
		await user.click(await screen.findByRole('button', { name: 'Criar evento' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' })),
		);
		const call = fetchMock.mock.calls.find(([url, init]) => url === '/api/events' && init?.method === 'POST');
		expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
			visibility: 'unlisted',
			status: 'published',
			tags: [],
		});
		expect(await screen.findByText('Seu evento está no ar. Que tal compartilhar agora?')).toBeInTheDocument();
		window.localStorage.removeItem('event-creation-wizard');
	});

	it('has no quick save: a new event only exists after the review', async () => {
		mockFetch([
			['/api/event-categories', () => jsonResponse({ data: [] })],
			['/api/organizer/profile', () => jsonResponse({ id: 'org-1', status: 'active' })],
		]);
		renderWithProviders(<EventCreationWizard />);

		expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
	});
});
