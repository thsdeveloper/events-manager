import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page, { metadata } from './page';
const backend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/backend-auth', () => ({
	authenticatedBackendFetch: backend,
	BackendRequestError: class extends Error {
		status = 404;
	},
}));
vi.mock('next/navigation', () => ({
	notFound: () => {
		throw new Error('not-found');
	},
}));
vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));
vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));
vi.mock('@/components/map/EventLocationView', () => ({ EventLocationView: () => null }));
it('uses owned event endpoints and renders an unindexed preview without checkout navigation', async () => {
	const event = {
		id: 'e-1',
		slug: 'teste',
		title: 'Meu rascunho privado',
		status: 'draft',
		description: '<p>Preparação</p>',
		tickets: [{ id: 't-1', title: 'Inteira', price: 10, quantity: 5 }],
		event_type: 'online',
		is_free: false,
	};
	backend.mockImplementation((path: string) => Promise.resolve(path.endsWith('/page') ? { draft: null } : event));
	const markup = renderToStaticMarkup(await Page({ params: Promise.resolve({ evento_id: 'e-1' }) }));
	expect(backend).toHaveBeenCalledWith('/api/events/e-1');
	expect(backend).toHaveBeenCalledWith('/api/events/e-1/page');
	expect(markup).toContain('Meu rascunho privado');
	expect(markup).not.toContain('href="/eventos/teste/checkout"');
	expect(metadata.robots).toEqual({ index: false, follow: false });
});
it('keeps an unavailable private event hidden', async () => {
	const { BackendRequestError } = await import('@/lib/backend-auth');
	backend.mockRejectedValue(new BackendRequestError('não encontrado', 404));
	await expect(Page({ params: Promise.resolve({ evento_id: 'other' }) })).rejects.toThrow('not-found');
});
