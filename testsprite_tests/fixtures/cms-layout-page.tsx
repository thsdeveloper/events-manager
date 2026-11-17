// Browser fixture: copied only into the isolated build, never into the application's routes.
import type { PageBlock } from '@events-manager/contracts';
import PageBuilder from '@/components/layout/PageBuilder';

export const dynamic = 'force-dynamic';

const photo = 'http://localhost:3004/images/empty/events.svg';
const blocks = [
	{
		collection: 'block_hero',
		item: {
			headline: 'Uma nova página',
			tagline: 'Contexto da página',
			description: 'Conteúdo de abertura legível em qualquer tema.',
			layout: 'image_right',
			image: photo,
			button_group: {
				id: 'buttons',
				buttons: [{ id: 'action', label: 'Explorar eventos', type: 'url', url: '/eventos', variant: 'default' }],
			},
		},
	},
	{
		collection: 'block_richtext',
		item: {
			headline: 'Texto editorial',
			tagline: 'Informações importantes',
			alignment: 'left',
			content:
				'<h3>Um subtítulo do conteúdo</h3><p>Texto com <strong>destaque</strong>, <a href="/eventos">link para eventos</a> e <code>código</code>.</p><blockquote>Uma citação que permanece legível.</blockquote><ul><li>Primeira condição de uso.</li><li>Segunda condição.</li></ul><h4>Detalhes adicionais</h4><p>Conteúdo de apoio ao leitor.</p><pre><code>const evento = "conferência";</code></pre><table><thead><tr><th>Item</th><th>Detalhe</th></tr></thead><tbody><tr><td>Acesso</td><td>Confirmado</td></tr></tbody></table>',
		},
	},
	{
		collection: 'block_gallery',
		item: { headline: 'Galeria de imagens', tagline: 'Momentos', items: [{ id: 'image-1', file: photo, sort: 1 }] },
	},
	{
		collection: 'block_pricing',
		item: {
			headline: 'Planos disponíveis',
			tagline: 'Escolha seu plano',
			pricing_cards: [
				{
					id: 'plan',
					title: 'Plano essencial',
					description: 'Tudo para começar.',
					price: 'R$ 99',
					badge: 'Popular',
					features: ['Suporte incluso', 'Inscrições online'],
					is_highlighted: true,
					button: { id: 'plan-action', label: 'Conhecer o plano', url: '/sobre', variant: 'default' },
				},
			],
		},
	},
	{
		collection: 'block_posts',
		item: {
			headline: 'Notícias da plataforma',
			tagline: 'Blog',
			limit: 6,
			posts: [
				{
					id: 'post',
					title: 'Artigo de demonstração',
					slug: 'bem-vindo-ao-blog',
					description: 'Novidades e informações para organizadores.',
					image: null,
				},
			],
		},
	},
	{
		collection: 'block_events',
		item: {
			headline: 'Encontre um evento',
			description: 'Experiências para todos os públicos.',
			events: [
				{
					id: 'event',
					title: 'Evento de demonstração',
					slug: 'evento-local-demonstracao',
					short_description: 'Um encontro para compartilhar experiências.',
					start_date: '2027-01-01T15:00:00Z',
					event_type: 'in_person',
					is_free: true,
					featured: true,
					location_name: 'Centro de eventos',
				},
			],
		},
	},
	{
		collection: 'block_form',
		item: {
			headline: 'Fale com a equipe',
			tagline: 'Contato',
			form: {
				id: 'form',
				title: 'Envie sua mensagem',
				is_active: true,
				submit_label: 'Enviar mensagem',
				fields: [{ id: 'field', name: 'name', label: 'Seu nome', type: 'text', required: true }],
			},
		},
	},
];

export default function CmsLayoutFixture() {
	const sections = (['light', 'dark'] as const).flatMap((background) =>
		blocks.map((block, index) => ({
			...block,
			id: `${background}-${index}`,
			background,
			item: { ...block.item, id: `item-${background}-${index}` },
		})),
	) as unknown as PageBlock[];

	return <PageBuilder sections={sections} />;
}
