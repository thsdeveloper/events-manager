/**
 * Construtor da página do evento. O organizador monta a landing por seções,
 * vê o resultado ao vivo e só publica um layout coerente. A seção de ingressos
 * é intocável: é por ela que se chega ao checkout.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { buildDefaultEventPageLayout, type Event, type EventPageRecord } from '@events-manager/contracts';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { EventPageBuilder } from './EventPageBuilder';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));
vi.mock('@/components/admin/ImageUpload', () => ({
	default: ({ label }: { label: string }) => <div>upload:{label}</div>,
	PENDING_UPLOAD_VALUE: 'local-file',
}));
vi.mock('@/features/cms/components/RichTextEditor', () => ({
	RichTextEditor: ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
		<textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
	),
}));
const revalidateEventPage = vi.fn();
vi.mock('@/features/event-page/actions', () => ({ revalidateEventPage: (slug: string) => revalidateEventPage(slug) }));
vi.mock('@/features/event-page/components/EventLandingPage', () => ({
	EventLandingPage: ({
		layout,
		mode,
	}: {
		layout: { sections: Array<{ type: string; anchor: string; hidden: boolean }>; header: { title?: string } };
		mode: string;
	}) => (
		<div data-testid="preview" data-mode={mode}>
			{layout.header.title}|
			{layout.sections
				.map((section) => `${section.type}:${section.anchor}${section.hidden ? '(oculta)' : ''}`)
				.join(',')}
		</div>
	),
}));

const event = {
	id: 'e-1',
	title: 'Congresso',
	slug: 'congresso',
	description: '<p>Três dias de encontros.</p>',
	short_description: 'Encontro anual.',
	start_date: '2026-09-19T12:00:00.000Z',
	end_date: '2026-09-21T21:00:00.000Z',
	organizer_id: { id: 'org-1', name: 'ADEB' },
	tickets: [],
} as unknown as Event;

function record(overrides: Partial<EventPageRecord> = {}): EventPageRecord {
	return {
		event_id: 'e-1',
		enabled: false,
		draft: buildDefaultEventPageLayout(event),
		published: null,
		published_at: null,
		date_updated: '2026-09-17T12:00:00.000Z',
		...overrides,
	};
}

function renderBuilder(page = record(), routes: Parameters<typeof mockFetch>[0] = []) {
	const fetchMock = mockFetch([
		...routes,
		[
			/\/api\/events\/e-1\/page$/,
			(_input, init) => jsonResponse({ ...page, draft: JSON.parse(String(init?.body)).draft }),
		],
	]);
	const view = renderWithProviders(<EventPageBuilder event={event} initialPage={page} autosaveDelayMs={30} />);

	return { fetchMock, ...view };
}

const preview = () => screen.getByTestId('preview').textContent ?? '';

describe('EventPageBuilder', () => {
	it('lists the sections of the draft in order and previews them live', () => {
		renderBuilder();

		const list = screen.getByRole('list', { name: 'Seções da página' });
		const items = within(list).getAllByRole('listitem');
		expect(items.map((item) => item.textContent)).toEqual([
			expect.stringContaining('Destaque'),
			expect.stringContaining('Sobre'),
			expect.stringContaining('Ingressos'),
		]);
		expect(preview()).toContain('hero:inicio,about:sobre,tickets:ingressos');
		expect(screen.getByTestId('preview')).toHaveAttribute('data-mode', 'preview');
	});

	it('never lets the tickets section be removed or hidden', () => {
		renderBuilder();

		const tickets = screen.getByRole('listitem', { name: /Ingressos/ });
		expect(within(tickets).getByRole('button', { name: /remover/i })).toBeDisabled();
		expect(within(tickets).getByRole('button', { name: /ocultar/i })).toBeDisabled();
		expect(within(tickets).queryByRole('button', { name: /duplicar/i })).not.toBeInTheDocument();
	});

	it('reorders with the move buttons and reflects it in the preview', async () => {
		const { user } = renderBuilder();

		const about = screen.getByRole('listitem', { name: /Sobre/ });
		await user.click(within(about).getByRole('button', { name: /mover .* para cima/i }));

		expect(preview()).toContain('about:sobre,hero:inicio,tickets:ingressos');
	});

	it('adds a section from the picker, but not a second copy of a single-use type', async () => {
		const { user } = renderBuilder();

		await user.click(screen.getByRole('button', { name: 'Adicionar seção' }));
		const dialog = screen.getByRole('dialog', { name: 'Adicionar seção' });
		expect(within(dialog).getByRole('button', { name: /Destaque/ })).toBeDisabled();
		await user.click(within(dialog).getByRole('button', { name: /Perguntas frequentes/ }));

		expect(preview()).toContain('faq:faq');
		expect(screen.getByRole('listitem', { name: /Perguntas frequentes/ })).toBeInTheDocument();
	});

	it('hides and removes an ordinary section', async () => {
		const { user } = renderBuilder();
		const about = () => screen.getByRole('listitem', { name: /Sobre/ });

		await user.click(within(about()).getByRole('button', { name: /ocultar/i }));
		expect(preview()).toContain('about:sobre(oculta)');

		await user.click(within(about()).getByRole('button', { name: /remover/i }));
		await user.click(screen.getByRole('button', { name: 'Remover seção' }));
		expect(preview()).not.toContain('about:');
	});

	it('edits a section in the side panel and applies the change to the draft', async () => {
		const { user } = renderBuilder();

		await user.click(
			within(screen.getByRole('listitem', { name: /Destaque/ })).getByRole('button', { name: /editar/i }),
		);
		const sheet = await screen.findByRole('dialog', { name: /Destaque/ });
		const title = within(sheet).getByLabelText('Título da seção');
		await user.clear(title);
		await user.type(title, 'Bem-vindos');
		await user.click(within(sheet).getByRole('button', { name: 'Aplicar' }));

		expect(screen.getByRole('listitem', { name: /Destaque/ })).toHaveTextContent('Bem-vindos');
	});

	it('saves the draft automatically shortly after a change, and on demand', async () => {
		const { fetchMock, user } = renderBuilder();
		const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');

		await user.click(within(screen.getByRole('listitem', { name: /Sobre/ })).getByRole('button', { name: /ocultar/i }));
		await waitFor(() => expect(puts()).toHaveLength(1));
		expect(JSON.parse(String(puts()[0][1]?.body)).draft.sections[1].hidden).toBe(true);
		expect(await screen.findByText(/salvo/i)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
		await waitFor(() => expect(puts()).toHaveLength(2));
	});

	it('edits the header: title, navigation limited to existing anchors, theme and footer', async () => {
		const { user } = renderBuilder();

		await user.clear(screen.getByLabelText('Título no cabeçalho'));
		await user.type(screen.getByLabelText('Título no cabeçalho'), 'Congresso 2026');
		expect(preview()).toContain('Congresso 2026|');

		await user.click(screen.getByRole('button', { name: 'Adicionar link' }));
		const links = screen.getAllByRole('combobox', { name: /seção do link/i });
		expect(links).toHaveLength(3);
		expect(screen.getByRole('checkbox', { name: 'Mostrar cabeçalho' })).toBeChecked();
		expect(screen.getByLabelText('Cor de destaque')).toBeInTheDocument();
		expect(screen.getByRole('checkbox', { name: 'Mostrar organizador no rodapé' })).toBeChecked();
	});

	it('refuses to publish an incoherent draft and points to the problem, without calling the API', async () => {
		const page = record();
		page.draft.header.nav = [{ label: 'Palestrantes', anchor: 'palestrantes' }];
		const { fetchMock, user } = renderBuilder(page);

		await user.click(screen.getByRole('button', { name: 'Publicar' }));

		expect(screen.getByRole('alert')).toHaveTextContent(/Palestrantes/);
		expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/publish'))).toBe(false);
	});

	it('publishes a coherent draft, shows it as live and offers the public link', async () => {
		const base = record();
		const published = { ...base, enabled: true, published: base.draft, published_at: '2026-09-17T13:00:00.000Z' };
		const { user } = renderBuilder(base, [[/\/page\/publish$/, () => jsonResponse(published)]]);

		await user.click(screen.getByRole('button', { name: 'Publicar' }));

		expect(await screen.findByText(/Publicada em/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Ver página' })).toHaveAttribute('href', '/eventos/congresso');
		expect(revalidateEventPage).toHaveBeenCalledWith('congresso');
	});

	it('shows the problems the API reports when it refuses to publish', async () => {
		const { user } = renderBuilder(record(), [
			[
				/\/page\/publish$/,
				() =>
					problemResponse(422, 'EVENT_PAGE_INVALID', 'A página ainda não pode ser publicada.', {
						issues: [{ code: 'tickets_required', message: 'Falta a seção de ingressos.', path: ['sections'] }],
					}),
			],
		]);

		await user.click(screen.getByRole('button', { name: 'Publicar' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Falta a seção de ingressos.');
	});

	it('goes back to the standard layout only after confirmation', async () => {
		const live = { ...record(), enabled: true, published: record().draft, published_at: '2026-09-17T13:00:00.000Z' };
		const { fetchMock, user } = renderBuilder(live, [
			[/\/page\/unpublish$/, () => jsonResponse({ ...live, enabled: false })],
		]);

		await user.click(screen.getByRole('button', { name: 'Voltar ao padrão' }));
		expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/unpublish'))).toBe(false);
		await user.click(screen.getByRole('button', { name: 'Voltar ao layout padrão' }));

		await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/unpublish'))).toBe(true));
		expect(await screen.findByText('Rascunho')).toBeInTheDocument();
		expect(revalidateEventPage).toHaveBeenCalledWith('congresso');
	});
});
