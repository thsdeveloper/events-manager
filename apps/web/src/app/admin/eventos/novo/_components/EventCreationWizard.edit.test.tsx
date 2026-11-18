import { renderAsOwner } from '@/test/permissions';
/**
 * Editar um evento usa o mesmo assistente em etapas da criação: mesma ordem,
 * mesmos campos, mesma barra de progresso. O que muda é o ponto de partida
 * (o evento guardado), a liberdade de ir a qualquer etapa e o envio, que
 * atualiza o evento em vez de criar outro.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { Event } from '@events-manager/contracts';
import { jsonResponse, mockFetch } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { resetServerAuthStore } from '@/hooks/useServerAuth';
import { consumeEventCreation } from '@/features/event-creation/lib/creation-feedback';
import { EventCreationWizard } from './EventCreationWizard';

beforeEach(() => {
	resetServerAuthStore();
	window.localStorage.removeItem('event-creation-wizard');
});

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
// Exercise Next's real lazy loading for form steps; browser-only effects need a browser.
vi.mock('next/dynamic', async () => {
	const actual = await import('next/dist/shared/lib/app-dynamic');

	return {
		default: (loader: Parameters<typeof actual.default>[0], options?: Parameters<typeof actual.default>[1]) =>
			options?.ssr === false ? () => null : actual.default(loader, options),
	};
});

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
		['/api/ai/generate-cover', () => jsonResponse({ fileId: '00000000-0000-4000-8000-000000000099' })],
	]);

	return { fetchMock, ...renderAsOwner(<EventCreationWizard mode="edit" event={event} />) };
}

describe('EventCreationWizard em modo de edição', () => {
	it('keeps visual as the last editing step and requires an explicit save after entering review', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');
		const navigation = screen.getByRole('tablist');
		expect(
			within(navigation)
				.getAllByRole('tab')
				.map((button) => button.textContent),
		).toEqual([
			expect.stringContaining('Básico'),
			expect.stringContaining('Detalhes'),
			expect.stringContaining('Agenda'),
			expect.stringContaining('Local'),
			expect.stringContaining('Ingressos'),
			expect.stringContaining('Visual'),
			expect.stringContaining('Revisão'),
		]);
		await user.click(screen.getByRole('tab', { name: /^Visual:/ }));
		await user.click(screen.getByRole('button', { name: 'Continuar' }));
		await screen.findByRole('button', { name: 'Salvar alterações' });
		expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
		await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
		await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1));
	});

	it('shows event dates in Agenda and leaves the sales period only on each ticket', async () => {
		const { user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');
		await user.click(screen.getByRole('tab', { name: /^Agenda:/ }));
		await screen.findByText('Início do evento');
		expect(screen.queryByRole('button', { name: /Período de inscrições/ })).not.toBeInTheDocument();
		expect(screen.getByText(/período de vendas.*ingresso/i)).toBeInTheDocument();
	});

	it('uses title, category, full description and tags when requesting a cover in the final editing step', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');
		await user.click(screen.getByRole('tab', { name: /^Visual:/ }));
		await user.click(await screen.findByRole('button', { name: 'Gerar imagem com IA' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/ai/generate-cover', expect.objectContaining({ method: 'POST' })),
		);
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/ai/generate-cover');
		expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
			title: event.title,
			categoryId: CATEGORY_ID,
			tags: ['jovens'],
			description: expect.stringContaining('Três dias'),
		});
		expect(await screen.findByRole('button', { name: 'Remover imagem' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute(
			'src',
			'/api/media/00000000-0000-4000-8000-000000000099',
		);
		expect(fetchMock.mock.calls.some(([url, init]) => url === '/api/events/e-1' && init?.method === 'PATCH')).toBe(
			false,
		);
	});

	it('lets the organizer choose an unlisted event and saves that choice', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');
		await user.click(screen.getByRole('tab', { name: /^Ingressos:/ }));
		await user.click(await screen.findByRole('radio', { name: /Não listado/ }));
		await user.click(screen.getByRole('tab', { name: /^Revisão:/ }));
		expect(await screen.findByText('Não listado — acesso pelo link')).toBeInTheDocument();
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
		const steps = screen.getByRole('tablist').closest('nav') ?? document.body;
		const detailsStep = within(steps).getByRole('tab', { name: /^Detalhes:/ });
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

		await user.click(screen.getByRole('tab', { name: /^Ingressos:/ }));

		expect(screen.queryByRole('button', { name: /adicionar ingresso/i })).not.toBeInTheDocument();
		expect(await screen.findByRole('link', { name: /gerenciar ingressos/i })).toHaveAttribute(
			'href',
			'/admin/eventos/e-1',
		);
	});

	it('saves the changes on the event itself and returns to its page', async () => {
		const { fetchMock, user } = renderEdit();
		await screen.findByDisplayValue('Congresso de Jovens da ADEB');

		await user.click(screen.getByRole('tab', { name: /^Revisão:/ }));
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

		await user.click(screen.getByRole('tab', { name: /^Detalhes:/ }));
		const editor = await screen.findByRole('textbox', { name: 'Descrição completa' });
		await user.click(editor);
		await user.keyboard('{Control>}a{/Control}{Backspace}');
		await user.click(screen.getByRole('tab', { name: /^Básico:/ }));
		expect(await screen.findByDisplayValue('Congresso de Jovens da ADEB')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Salvar' }));

		expect(await screen.findByRole('tab', { name: /^Detalhes:/ })).toHaveAttribute('aria-selected', 'true');
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
		const { user } = renderAsOwner(<EventCreationWizard />);
		await user.click(await screen.findByRole('button', { name: 'Adicionar ingresso' }));
		const dialog = await screen.findByRole('dialog', { name: 'Novo ingresso' });
		await user.type(within(dialog).getByRole('textbox', { name: /Nome do ingresso/ }), 'Lote 1');
		const price = within(dialog).getByRole('textbox', { name: /Valor do ingresso/ });
		await user.clear(price);
		await user.type(price, '5000');
		await user.click(within(dialog).getByRole('checkbox', { name: /Permitir parcelamento/ }));
		await user.type(within(dialog).getByRole('spinbutton', { name: /Máximo de parcelas/ }), '3');
		await user.click(within(dialog).getByRole('button', { name: 'Adicionar ingresso' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo ingresso' })).not.toBeInTheDocument());
		expect(screen.getByText('Lote 1')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /^Ingressos:/ })).toHaveAttribute('aria-selected', 'true');
		expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
		await user.click(screen.getByRole('button', { name: 'Continuar' }));
		await screen.findByRole('heading', { name: 'Uma capa irresistível' });
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
		const { user } = renderAsOwner(
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
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/eventos/new-event'));
		expect(screen.queryByText('Seu evento está no ar. Que tal compartilhar agora?')).not.toBeInTheDocument();
		expect(consumeEventCreation('new-event')).toMatchObject({ status: 'published' });
		window.localStorage.removeItem('event-creation-wizard');
	});

	it('has no quick save: a new event only exists after the review', async () => {
		mockFetch([
			['/api/event-categories', () => jsonResponse({ data: [] })],
			['/api/organizer/profile', () => jsonResponse({ id: 'org-1', status: 'active' })],
		]);
		renderAsOwner(<EventCreationWizard />);

		expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
	});
});

describe('rascunhos e prévia', () => {
	function setup(initialDraft?: { id: string; values: Record<string, unknown>; current_step: number }) {
		const requests = mockFetch([
			['/api/auth/me', () => jsonResponse({ user: { id: 'u-1', email: 'organizer@example.com' } })],
			['/api/event-categories', () => jsonResponse({ data: [] })],
			['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-1', status: 'active' } })],
			['/api/event-drafts', () => jsonResponse({ id: 'd-1', values: {}, current_step: 0 })],
			['/api/event-drafts/d-1', () => jsonResponse({ id: 'd-1', values: {}, current_step: 0 })],
		]);
		const props = { mode: 'create' as const, initialDraft };

		return { requests, ...renderAsOwner(<EventCreationWizard {...props} />) };
	}
	it('previews an incomplete event without publishing or navigating to checkout', async () => {
		const { requests, user } = setup();
		await user.type(await screen.findByRole('textbox', { name: /Nome do evento/ }), 'Encontro em preparação');
		await user.click(screen.getByRole('button', { name: 'Prévia' }));
		const preview = await screen.findByRole('dialog', { name: 'Prévia do evento' });
		await waitFor(() => expect(screen.getByRole('heading', { name: 'Encontro em preparação' })).toBeInTheDocument(), {
			timeout: 5000,
		});
		expect(within(preview).queryByRole('link', { name: /Comprar|Inscrever/ })).not.toBeInTheDocument();
		expect(requests.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
	});
	it('saves an incomplete draft separately from the event', async () => {
		const { requests, user } = setup();
		await user.type(await screen.findByRole('textbox', { name: /Nome do evento/ }), 'Ideia de evento');
		await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
		await waitFor(() =>
			expect(requests).toHaveBeenCalledWith('/api/event-drafts', expect.objectContaining({ method: 'POST' })),
		);
		const call = requests.mock.calls.find(([url, init]) => url === '/api/event-drafts' && init?.method === 'POST');
		expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
			values: { title: 'Ideia de evento' },
			current_step: 0,
		});
		expect(requests.mock.calls.some(([url, init]) => url === '/api/events' && init?.method === 'POST')).toBe(false);
		expect(await screen.findByText('Rascunho salvo na sua conta.')).toBeInTheDocument();
	});
	it('resumes a server snapshot without overwriting it with another local draft', async () => {
		window.localStorage.setItem('event-creation-wizard', JSON.stringify({ formData: { title: 'Outro rascunho' } }));
		const { requests, user } = setup({ id: 'd-1', values: { title: 'Retomado da conta' }, current_step: 0 });
		expect(await screen.findByDisplayValue('Retomado da conta')).toBeInTheDocument();
		expect(screen.queryByDisplayValue('Outro rascunho')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
		await waitFor(() =>
			expect(requests).toHaveBeenCalledWith('/api/event-drafts/d-1', expect.objectContaining({ method: 'PUT' })),
		);
	});
});

it('allows a pending organizer to prepare a snapshot without creating an event', async () => {
	const requests = mockFetch([
		['/api/event-categories', () => jsonResponse({ data: [] })],
		['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-pending', status: 'pending' } })],
		[
			'/api/event-drafts/d-pending',
			() => jsonResponse({ id: 'd-pending', values: { title: 'Preparado' }, current_step: 6 }),
		],
	]);
	const { user } = renderAsOwner(
		<EventCreationWizard
			draftOnly
			initialDraft={{ id: 'd-pending', values: { title: 'Preparado' }, current_step: 6 }}
		/>,
	);
	expect(await screen.findByText(/A publicação fica disponível após a aprovação/)).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Criar evento' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
	await waitFor(() =>
		expect(requests).toHaveBeenCalledWith('/api/event-drafts/d-pending', expect.objectContaining({ method: 'PUT' })),
	);
	expect(requests.mock.calls.some(([url, init]) => url === '/api/events' && init?.method === 'POST')).toBe(false);
});
it('preserves local changes when snapshot saving fails and retries without losing edits', async () => {
	let attempts = 0;
	const requests = mockFetch([
		['/api/event-categories', () => jsonResponse({ data: [] })],
		['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-1', status: 'active' } })],
		[
			'/api/event-drafts',
			() =>
				++attempts === 1
					? new Response(JSON.stringify({ detail: 'Serviço indisponível' }), { status: 503 })
					: jsonResponse({ id: 'd-retry', values: {}, current_step: 0 }),
		],
	]);
	const { user } = renderAsOwner(<EventCreationWizard />);
	await user.type(await screen.findByRole('textbox', { name: /Nome do evento/ }), 'Meu encontro');
	await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
	expect(await screen.findByText('Serviço indisponível')).toBeInTheDocument();
	expect(JSON.parse(window.localStorage.getItem('event-creation-wizard') ?? '{}').formData.title).toBe('Meu encontro');
	await user.type(screen.getByRole('textbox', { name: /Nome do evento/ }), ' atualizado');
	await user.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }));
	expect(await screen.findByText('Rascunho salvo na sua conta.')).toBeInTheDocument();
	const call = requests.mock.calls
		.filter(([url, init]) => url === '/api/event-drafts' && init?.method === 'POST')
		.at(-1);
	expect(JSON.parse(String(call?.[1]?.body)).values.title).toBe('Meu encontro atualizado');
});

it.each(['draft', 'cancelled', 'archived'] as const)(
	'reports the returned %s state when retrying a converted snapshot requested as published',
	async (status) => {
		const draftId = '00000000-0000-4000-8000-000000000091';
		const requests = mockFetch([
			['/api/auth/me', () => jsonResponse({ user: { id: 'u-1', email: 'organizer@example.com' } })],
			['/api/event-categories', () => jsonResponse({ data: [{ id: CATEGORY_ID, name: 'Religioso' }] })],
			['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-1', status: 'active' } })],
			['/api/events', () => jsonResponse({ id: 'existing-event', status })],
		]);
		const { user } = renderAsOwner(
			<>
				<EventCreationWizard
					initialDraft={{
						id: draftId,
						values: {
							...event,
							category_id: CATEGORY_ID,
							cover_image: '',
							tickets: [],
							tags: [],
							status: 'published',
							publish_after_create: false,
						},
						current_step: 6,
					}}
				/>
				<Toaster />
			</>,
		);
		const create = await screen.findByRole('button', { name: 'Criar evento' });
		await waitFor(() => expect(create).toBeEnabled());
		await user.click(create);
		await waitFor(() =>
			expect(requests.mock.calls.some(([url, init]) => url === '/api/events' && init?.method === 'POST')).toBe(true),
		);
		await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/eventos/existing-event'));
		expect(consumeEventCreation('existing-event')).toMatchObject({ status });
		expect(screen.queryByText('Seu evento está no ar. Que tal compartilhar agora?')).not.toBeInTheDocument();
		const call = requests.mock.calls.find(([url, init]) => url === '/api/events' && init?.method === 'POST');
		expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ draft_id: draftId, status: 'published' });
	},
);
