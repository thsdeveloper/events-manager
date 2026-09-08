import type { Post } from '@events-manager/contracts';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import BlogIndex from './BlogIndex';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

const posts: Post[] = [
	{
		id: 'p1',
		name: 'Bem-vindo',
		title: 'Bem-vindo ao blog',
		slug: 'bem-vindo',
		description: 'Novidades da plataforma.',
		published_at: '2026-09-04T15:00:00.000Z',
		image: { id: 'cover', bucket: 'media', path: 'cms/cover.jpg' },
	},
	{ id: 'p2', name: 'Sem capa', title: 'Post sem capa', slug: 'sem-capa', published_at: '2026-08-20T03:00:00.000Z' },
];

describe('BlogIndex', () => {
	it('lists each post as a card linking to it, with cover, summary and the date in Portuguese', () => {
		const markup = renderToStaticMarkup(<BlogIndex posts={posts} page={1} totalPages={1} />);

		expect(markup).toMatch(/<a[^>]*href="\/blog\/bem-vindo"/);
		expect(markup).toContain('Bem-vindo ao blog');
		expect(markup).toContain('Novidades da plataforma.');
		expect(markup).toMatch(/<img[^>]*src="[^"]*cms\/cover\.jpg"/);
		expect(markup).toContain('4 de setembro de 2026');
		expect(markup).toContain('Post sem capa');
		expect(markup).toMatch(/<time dateTime="2026-09-04T15:00:00.000Z"|<time datetime="2026-09-04T15:00:00.000Z"/);
	});

	it('shows previous/next links that keep the ?page= convention, only when there is somewhere to go', () => {
		const middle = renderToStaticMarkup(<BlogIndex posts={posts} page={2} totalPages={3} />);
		const first = renderToStaticMarkup(<BlogIndex posts={posts} page={1} totalPages={3} />);
		const last = renderToStaticMarkup(<BlogIndex posts={posts} page={3} totalPages={3} />);
		const single = renderToStaticMarkup(<BlogIndex posts={posts} page={1} totalPages={1} />);

		expect(middle).toMatch(/<a[^>]*href="\/blog\?page=3"[^>]*rel="next"/);
		expect(middle).toMatch(/<a[^>]*href="\/blog"[^>]*rel="prev"/);
		expect(middle).toContain('Próxima');
		expect(middle).toContain('Anterior');
		expect(middle).toContain('Página 2 de 3');
		expect(first).not.toContain('Anterior');
		expect(last).not.toContain('Próxima');
		expect(single).not.toContain('Página 1 de 1');
	});

	it('tells the reader when there is nothing published yet', () => {
		const markup = renderToStaticMarkup(<BlogIndex posts={[]} page={1} totalPages={0} />);

		expect(markup).toContain('Ainda não há posts publicados');
	});
});
