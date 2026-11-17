import type { ReactNode } from 'react';
import type { PageBlock } from '@events-manager/contracts';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import PageBuilder from '@/components/layout/PageBuilder';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));

const section = (collection: string, item: Record<string, unknown>): PageBlock =>
	({
		id: collection,
		collection,
		background: 'dark',
		item: { id: collection, ...item },
	}) as PageBlock;

describe('CMS blocks in the shared page surface', () => {
	it.each(['image_left', 'image_center', 'image_right'])(
		'keeps the hero image and call to action in the %s layout',
		(layout) => {
			renderWithProviders(
				<PageBuilder
					sections={[
						section('block_hero', {
							headline: 'Encontre sua próxima experiência',
							tagline: 'Eventos',
							description: 'Participe de encontros memoráveis.',
							layout,
							image: 'https://example.test/cover.jpg',
							button_group: {
								id: 'actions',
								buttons: [{ id: 'link', label: 'Explorar eventos', type: 'url', url: '/eventos' }],
							},
						}),
					]}
				/>,
			);
			expect(screen.getByRole('heading', { level: 1, name: 'Encontre sua próxima experiência' })).toBeInTheDocument();
			expect(screen.getByRole('img', { name: 'Eventos' })).toHaveAttribute('src', 'https://example.test/cover.jpg');
			expect(screen.getByRole('link', { name: 'Explorar eventos' })).toHaveAttribute('href', '/eventos');
		},
	);

	it('preserves plans, benefits and the action links within their section', () => {
		renderWithProviders(
			<PageBuilder
				sections={[
					section('block_pricing', {
						headline: 'Planos disponíveis',
						tagline: 'Para organizadores',
						pricing_cards: [
							{
								id: 'plan',
								title: 'Plano essencial',
								price: 'R$ 99',
								description: 'Tudo para começar.',
								badge: 'Popular',
								features: ['Suporte incluso'],
								is_highlighted: true,
								button: { id: 'action', label: 'Conhecer plano', url: '/sobre' },
							},
						],
					}),
				]}
			/>,
		);
		const plan = within(screen.getByRole('region', { name: 'Planos disponíveis' }));
		expect(plan.getByRole('heading', { name: 'Plano essencial', level: 3 })).toBeInTheDocument();
		expect(plan.getByText('Suporte incluso')).toBeInTheDocument();
		expect(plan.getByRole('link', { name: 'Conhecer plano' })).toHaveAttribute('href', '/sobre');
	});

	it('renders the published posts, gallery and contact fields without replacing their content', async () => {
		mockFetch([
			['/api/content/posts', () => jsonResponse({ total: 1, data: [] })],
			['/api/forms/form/submissions', () => jsonResponse({ success: true })],
		]);
		const { user } = renderWithProviders(
			<PageBuilder
				sections={[
					section('block_posts', {
						headline: 'Novidades',
						limit: 6,
						posts: [
							{ id: 'post', title: 'Bem-vindo ao blog', slug: 'bem-vindo', description: 'Notícias da plataforma.' },
						],
					}),
					section('block_gallery', {
						headline: 'Galeria',
						items: [{ id: 'image', file: 'https://example.test/gallery.jpg' }],
					}),
					section('block_form', {
						headline: 'Contato',
						form: {
							id: 'form',
							title: 'Fale conosco',
							is_active: true,
							submit_label: 'Enviar mensagem',
							fields: [{ id: 'name', name: 'name', label: 'Seu nome', type: 'text' }],
						},
					}),
				]}
			/>,
		);
		expect(await screen.findByRole('link', { name: /Bem-vindo ao blog/ })).toHaveAttribute('href', '/blog/bem-vindo');
		expect(within(screen.getByRole('region', { name: 'Galeria' })).getByRole('img')).toHaveAttribute(
			'src',
			'https://example.test/gallery.jpg',
		);
		expect(screen.getByRole('textbox', { name: 'Seu nome' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeInTheDocument();
		await user.type(screen.getByRole('textbox', { name: 'Seu nome' }), 'Ana');
		await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
		expect(await screen.findByText('Formulário enviado com sucesso.')).toBeInTheDocument();
	});
});
