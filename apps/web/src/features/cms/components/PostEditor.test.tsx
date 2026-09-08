import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import type { CmsPostRow } from '../types';
import { PostEditor } from './PostEditor';

const push = vi.fn();
const refresh = vi.fn();
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

describe('PostEditor', () => {
	// O editor rico carrega o ProseMirror; com instrumentação de cobertura o tempo padrão de 5s não basta.
	it('derives the slug from the title and creates the post as a draft', { timeout: 20_000 }, async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/posts', () => jsonResponse({ id: 'post-1' }, { status: 201 })],
		]);
		const { user } = renderWithProviders(<PostEditor post={null} siteUrl="https://eventos.local" />);

		await user.type(screen.getByLabelText(/^título$/i), 'Guia de Check-in');
		expect(screen.getByLabelText(/^slug$/i)).toHaveValue('guia-de-check-in');
		await user.click(screen.getByLabelText(/resumo/i));
		await user.paste('Como receber o público sem filas.');
		await user.click(screen.getByRole('button', { name: /^salvar$/i }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/super-admin/conteudo/blog/post-1'));
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toMatchObject({
			title: 'Guia de Check-in',
			slug: 'guia-de-check-in',
			description: 'Como receber o público sem filas.',
			status: 'draft',
			published_at: null,
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('links to the public post when it is published', () => {
		mockFetch([]);
		const post: CmsPostRow = {
			id: 'post-2',
			title: 'Olá',
			slug: 'ola',
			description: null,
			content: '<p>x</p>',
			status: 'published',
			published_at: '2026-01-01T00:00:00Z',
			seo: null,
			author: null,
			author_profile: null,
			image: null,
			date_created: '2026-01-01T00:00:00Z',
			date_updated: null,
		};
		renderWithProviders(<PostEditor post={post} siteUrl="https://eventos.local" />);

		expect(screen.getByRole('link', { name: /ver no site/i })).toHaveAttribute(
			'href',
			'https://eventos.local/blog/ola',
		);
	});
});
