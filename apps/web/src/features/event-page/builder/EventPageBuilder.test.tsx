import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { buildDefaultEventPageLayout, type EventPageRecord } from '@events-manager/contracts';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { renderAsOwner, TestPermissions, ownerAccess } from '@/test/permissions';
import { publicEventFixture } from '@/test/event-page-fixtures';
import { PuckEventPageEditor as EventPageBuilder } from './PuckEventPageEditor';
import { EventPageBuilder as LazyEventPageBuilder } from './EventPageBuilder';
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('next/image', () => ({
	default: ({
		fill: _,
		priority: __,
		...props
	}: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img {...props} />,
}));
const event = { ...publicEventFixture, cover_image: null };
function record(): EventPageRecord {
	return {
		event_id: event.id,
		enabled: false,
		draft: buildDefaultEventPageLayout(event),
		published: null,
		published_at: null,
		date_updated: '2026-11-19T12:00:00Z',
	};
}
async function setup(page = record(), routes: Parameters<typeof mockFetch>[0] = []) {
	const fetchMock = mockFetch([
		...routes,
		[/\/page$/, (_input, init) => jsonResponse({ ...page, draft: JSON.parse(String(init?.body)).draft })],
	]);
	const view = renderAsOwner(<EventPageBuilder event={event} initialPage={page} autosaveDelayMs={100} />);
	await view.user.click(await screen.findByTitle('Abrir menu do editor'));
	await view.user.click(screen.getByTitle('Mostrar ou ocultar propriedades'));

	return { ...view, fetchMock };
}
beforeEach(() => {
	Element.prototype.getAnimations = () => [];
	window.scrollTo = () => {};
	document.elementsFromPoint = () => [];
});
describe('editor visual Puck da página do evento', { timeout: 20_000 }, () => {
	it('oferece histórico, catálogo de seções e campos do cabeçalho', async () => {
		await setup();
		expect(await screen.findByRole('button', { name: 'Desfazer' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Refazer' })).toBeDisabled();
		expect((await screen.findAllByLabelText('Título no cabeçalho'))[0]).toBeInTheDocument();
		expect(screen.getAllByLabelText('Mostrar cabeçalho')[0]).toBeChecked();
		expect(screen.getByText('Programação e pessoas')).toBeInTheDocument();
	});
	it('salva o título editado sem exigir publicação e permite desfazer', async () => {
		const { user, fetchMock } = await setup();
		const title = (await screen.findAllByLabelText('Título no cabeçalho'))[0];
		await user.clear(title);
		await user.type(title, 'Encontro especial');
		await waitFor(() =>
			expect(
				fetchMock.mock.calls.some(
					([, init]) =>
						init?.method === 'PUT' && JSON.parse(String(init.body)).draft.header.title === 'Encontro especial',
				),
			).toBe(true),
		);
		await waitFor(() => expect(screen.getByRole('button', { name: 'Desfazer' })).toBeEnabled());
		await user.click(screen.getByRole('button', { name: 'Desfazer' }));
		await waitFor(() =>
			expect(screen.getAllByLabelText('Título no cabeçalho')[0]).not.toHaveValue('Encontro especial'),
		);
		expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/publish'))).toBe(false);
	});
	it('publica um rascunho válido e oferece o link público', async () => {
		const page = record();
		const { user } = await setup(page, [
			[
				/\/publish$/,
				() => jsonResponse({ ...page, enabled: true, published: page.draft, published_at: '2026-11-19T13:00:00Z' }),
			],
		]);
		await user.click(await screen.findByRole('button', { name: 'Publicar' }));
		expect(await screen.findByText(/Publicada em/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Ver página' })).toHaveAttribute('href', `/eventos/${event.slug}`);
	});
	it('exibe problemas de navegação antes de fazer requisições de publicação', async () => {
		const page = record();
		page.draft.header.nav = [{ label: 'Palestrantes', anchor: 'inexistente' }];
		const { user, fetchMock } = await setup(page);
		await user.click(await screen.findByRole('button', { name: 'Publicar' }));
		expect(await screen.findByRole('alert')).toHaveTextContent(/Palestrantes/);
		expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/publish'))).toBe(false);
	});
	it('não publica quando o salvamento falha e mantém a edição para tentar novamente', async () => {
		const page = record();
		page.date_updated = '';
		const { user, fetchMock } = await setup(page, [
			[/\/page$/, () => problemResponse(500, 'INTERNAL_ERROR', 'Falha ao salvar.')],
		]);
		await user.click(await screen.findByRole('button', { name: 'Publicar' }));
		expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao salvar/);
		expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/publish'))).toBe(false);
		expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
	});
	it('mostra os problemas de publicação informados pela API', async () => {
		const { user } = await setup(record(), [
			[
				/\/publish$/,
				() =>
					problemResponse(422, 'EVENT_PAGE_INVALID', 'Página inválida.', {
						issues: [{ code: 'tickets_required', message: 'Falta a seção de ingressos.', path: ['sections'] }],
					}),
			],
		]);
		await user.click(await screen.findByRole('button', { name: 'Publicar' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Falta a seção de ingressos.');
	});
	it('restaura o layout padrão somente após confirmar e preserva o rascunho', async () => {
		const page = record();
		page.enabled = true;
		page.published = page.draft;
		page.published_at = '2026-11-19T13:00:00Z';
		const { user, fetchMock } = await setup(page, [[/\/unpublish$/, () => jsonResponse({ ...page, enabled: false })]]);
		await user.click(await screen.findByRole('button', { name: 'Voltar ao padrão' }));
		expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/unpublish'))).toBe(false);
		const dialog = screen.getByRole('alertdialog');
		await user.click(within(dialog).getByRole('button', { name: 'Voltar ao layout padrão' }));
		expect(await screen.findByText('Rascunho')).toBeInTheDocument();
		expect((await screen.findAllByLabelText('Título no cabeçalho'))[0]).toBeInTheDocument();
	});
	it('permite apenas consultar quando o acesso não inclui edição e publicação', async () => {
		renderWithProviders(
			<TestPermissions access={{ ...ownerAccess, isOwner: false, permissions: ['event_pages.read'] }}>
				<EventPageBuilder event={event} initialPage={record()} />
			</TestPermissions>,
		);
		expect(await screen.findByText('Modo de consulta')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
		expect((await screen.findAllByLabelText('Título no cabeçalho'))[0]).toHaveAttribute('readonly');
	});
	it('duplica pelo Puck com uma nova âncora, sem quebrar os links da página', async () => {
		const { user, fetchMock } = await setup();
		await user.click(screen.getByTitle('Mostrar ou ocultar seções'));
		await user.click(screen.getByText('Estrutura', { exact: true }));
		await user.hover((await screen.findAllByRole('button', { name: 'Sobre' }))[0]);
		await user.click((await screen.findAllByTitle('Duplicar seção'))[0]);
		await waitFor(
			() => {
				const save = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT').at(-1);
				const sections = save ? JSON.parse(String(save[1]?.body)).draft.sections : [];
				expect(sections).toHaveLength(4);
				expect(sections.map((item: { anchor: string }) => item.anchor)).toEqual([
					'inicio',
					'sobre',
					'sobre-2',
					'ingressos',
				]);
			},
			{ timeout: 4000 },
		);
	});
	it('carrega o editor pela entrada assíncrona usada na rota administrativa', async () => {
		renderAsOwner(<LazyEventPageBuilder event={event} initialPage={record()} />);
		expect((await screen.findAllByLabelText('Título no cabeçalho', {}, { timeout: 5000 }))[0]).toHaveValue(event.title);
	});
});
