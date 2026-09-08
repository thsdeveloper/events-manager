import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import type { CmsPageDetail } from '../types';
import { PageEditor } from './PageEditor';

const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

const page: CmsPageDetail = {
	id: '20000000-0000-0000-0000-000000000002',
	title: 'Sobre',
	permalink: '/sobre',
	status: 'draft',
	published_at: null,
	seo: { title: 'Sobre nós', meta_description: null, no_index: false, no_follow: false },
	sort: null,
	date_created: '2026-09-01T00:00:00Z',
	date_updated: '2026-09-02T00:00:00Z',
	blocks: [],
};

describe('PageEditor', () => {
	it('saves the page with the complete validated payload and refreshes the screen', { timeout: 20_000 }, async () => {
		const fetchMock = mockFetch([
			[`/api/super-admin/cms/pages/${page.id}`, () => jsonResponse({ ...page, title: 'Sobre nós' })],
		]);
		const { user } = renderWithProviders(<PageEditor page={page} activity={[]} siteUrl="https://eventos.local" />);

		const title = screen.getByLabelText(/^título$/i);
		await user.clear(title);
		await user.type(title, 'Sobre nós');
		await user.click(screen.getByRole('button', { name: /^salvar$/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('PATCH');
		expect(JSON.parse(String(init?.body))).toEqual({
			title: 'Sobre nós',
			permalink: '/sobre',
			status: 'draft',
			published_at: null,
			seo: { title: 'Sobre nós', meta_description: null, no_index: false, no_follow: false },
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('tells the person when the permalink is already taken by another page', async () => {
		mockFetch([
			[
				`/api/super-admin/cms/pages/${page.id}`,
				() => problemResponse(409, 'PERMALINK_IN_USE', 'Já existe uma página com o permalink /sobre.'),
			],
		]);
		const { user } = renderWithProviders(<PageEditor page={page} activity={[]} siteUrl="https://eventos.local" />);

		await user.click(screen.getByRole('button', { name: /^salvar$/i }));

		expect(await screen.findByText('Já existe uma página com o permalink /sobre.')).toBeInTheDocument();
		expect(refresh).not.toHaveBeenCalled();
	});

	it('refuses an invalid permalink before calling the API', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<PageEditor page={page} activity={[]} siteUrl="https://eventos.local" />);

		const permalink = screen.getByLabelText(/permalink/i);
		await user.clear(permalink);
		await user.type(permalink, '/admin/x');
		await user.click(screen.getByRole('button', { name: /^salvar$/i }));

		expect(await screen.findByText(/reservado pela aplicação/i)).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('opens a preview link in a new tab', async () => {
		mockFetch([
			[
				`/api/super-admin/cms/pages/${page.id}/preview`,
				() =>
					jsonResponse({ token: 't', url: 'https://eventos.local/sobre?preview=t', expiresAt: '' }, { status: 201 }),
			],
		]);
		const open = vi.fn();
		vi.stubGlobal('open', open);
		const { user } = renderWithProviders(<PageEditor page={page} activity={[]} siteUrl="https://eventos.local" />);

		await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));

		await waitFor(() =>
			expect(open).toHaveBeenCalledWith('https://eventos.local/sobre?preview=t', '_blank', 'noopener'),
		);
	});

	it('does not allow deleting the home page and explains why', () => {
		mockFetch([]);
		renderWithProviders(
			<PageEditor page={{ ...page, permalink: '/', title: 'Início' }} activity={[]} siteUrl="https://eventos.local" />,
		);

		expect(screen.getByRole('button', { name: /excluir página/i })).toBeDisabled();
		expect(screen.getByText(/página inicial não pode ser excluída/i)).toBeInTheDocument();
	});
});
