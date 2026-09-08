import { describe, expect, it } from 'vitest';
import {
	CMS_BLOCK_COLLECTIONS,
	cmsFormInputSchema,
	cmsNavigationItemInputSchema,
	cmsPageBlockInputSchema,
	cmsPageInputSchema,
	cmsPostInputSchema,
	cmsRedirectInputSchema,
	cmsSeoSchema,
	cmsSiteSettingsInputSchema,
	normalizePermalink,
	permalinkSchema,
	RESERVED_PERMALINK_PREFIXES,
	slugify,
	slugSchema,
} from './cms.js';

const uuid = '00000000-0000-4000-8000-000000000001';

function issuePaths(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }) {
	return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('normalizePermalink and slugify', () => {
	it('turns a human title into a lowercase, accent-free permalink', () => {
		expect(normalizePermalink('Sobre Nós')).toBe('/sobre-nos');
		expect(normalizePermalink('  /Quem Somos/ Equipe /')).toBe('/quem-somos/equipe');
		expect(normalizePermalink('')).toBe('/');
		expect(normalizePermalink('/')).toBe('/');
		expect(slugify('Festival de Inverno 2026!')).toBe('festival-de-inverno-2026');
	});
});

describe('permalinkSchema', () => {
	it.each(['/', '/sobre', '/quem-somos/equipe', '/faq-2026'])('accepts %s', (value) => {
		expect(permalinkSchema.safeParse(value).success).toBe(true);
	});

	it.each(['sobre', '//sobre', '/sobre/', '/Sobre', '/sobre nós', '/sobre?x=1', '/a//b'])('rejects %s', (value) => {
		expect(permalinkSchema.safeParse(value).success).toBe(false);
	});

	it('rejects permalinks that would shadow application routes', () => {
		expect(RESERVED_PERMALINK_PREFIXES).toEqual(
			expect.arrayContaining(['/admin', '/super-admin', '/perfil', '/login', '/api', '/eventos', '/blog', '/taxas']),
		);
		expect(permalinkSchema.safeParse('/eventos').success).toBe(false);
		expect(permalinkSchema.safeParse('/eventos/festival').success).toBe(false);
		expect(permalinkSchema.safeParse('/eventos-parceiros').success).toBe(true);
	});
});

describe('slugSchema', () => {
	it('accepts lowercase hyphenated slugs and rejects anything else', () => {
		expect(slugSchema.safeParse('meu-primeiro-post').success).toBe(true);
		expect(slugSchema.safeParse('Meu Post').success).toBe(false);
		expect(slugSchema.safeParse('-inicio').success).toBe(false);
	});
});

describe('cmsSeoSchema', () => {
	it('bounds title and description to what search engines display', () => {
		expect(cmsSeoSchema.safeParse({ title: 'a'.repeat(70), meta_description: 'b'.repeat(160) }).success).toBe(true);
		expect(issuePaths(cmsSeoSchema.safeParse({ title: 'a'.repeat(71) }))).toContain('title');
		expect(issuePaths(cmsSeoSchema.safeParse({ meta_description: 'b'.repeat(161) }))).toContain('meta_description');
	});

	it('defaults robots flags to indexable and validates sitemap hints', () => {
		const parsed = cmsSeoSchema.parse({});
		expect(parsed).toMatchObject({ no_index: false, no_follow: false });

		expect(
			cmsSeoSchema.safeParse({ sitemap: { change_frequency: 'weekly', priority: 0.8 } }).success,
		).toBe(true);
		expect(cmsSeoSchema.safeParse({ sitemap: { change_frequency: 'sometimes', priority: 0.8 } }).success).toBe(false);
		expect(cmsSeoSchema.safeParse({ sitemap: { change_frequency: 'weekly', priority: 2 } }).success).toBe(false);
	});

	it('accepts an uploaded og_image and an absolute canonical URL only', () => {
		expect(cmsSeoSchema.safeParse({ og_image: uuid, canonical_url: 'https://ex.com/a' }).success).toBe(true);
		expect(cmsSeoSchema.safeParse({ og_image: 'foto.png' }).success).toBe(false);
		expect(cmsSeoSchema.safeParse({ canonical_url: '/relativo' }).success).toBe(false);
	});
});

describe('cmsPageInputSchema', () => {
	it('requires a title and a valid permalink, defaulting to draft', () => {
		const parsed = cmsPageInputSchema.parse({ title: 'Sobre', permalink: '/sobre' });
		expect(parsed).toMatchObject({ title: 'Sobre', permalink: '/sobre', status: 'draft', published_at: null });

		expect(issuePaths(cmsPageInputSchema.safeParse({ title: '', permalink: '/x' }))).toContain('title');
		expect(issuePaths(cmsPageInputSchema.safeParse({ title: 'x', permalink: 'x' }))).toContain('permalink');
	});

	it('accepts a scheduled publication and nested SEO', () => {
		const result = cmsPageInputSchema.safeParse({
			title: 'Sobre',
			permalink: '/sobre',
			status: 'published',
			published_at: '2026-10-01T12:00:00.000Z',
			seo: { title: 'Sobre nós', no_index: true },
		});
		expect(result.success).toBe(true);
		expect(cmsPageInputSchema.safeParse({ title: 'x', permalink: '/x', published_at: 'amanhã' }).success).toBe(false);
		expect(cmsPageInputSchema.safeParse({ title: 'x', permalink: '/x', status: 'archived' }).success).toBe(false);
	});
});

describe('cmsPageBlockInputSchema', () => {
	it('lists every block collection the page builder can render', () => {
		expect(CMS_BLOCK_COLLECTIONS).toEqual([
			'block_hero',
			'block_richtext',
			'block_gallery',
			'block_pricing',
			'block_posts',
			'block_events',
			'block_form',
		]);
	});

	it('validates a hero with its buttons and layout', () => {
		const result = cmsPageBlockInputSchema.safeParse({
			collection: 'block_hero',
			item: {
				headline: 'Eventos que viram boas histórias',
				layout: 'image_right',
				buttons: [
					{ label: 'Explorar', type: 'url', url: '/eventos', variant: 'default' },
					{ label: 'Sobre', type: 'page', page: uuid },
				],
			},
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toMatchObject({ background: 'light', hide_block: false });
		}

		const missingUrl = cmsPageBlockInputSchema.safeParse({
			collection: 'block_hero',
			item: { headline: 'x', buttons: [{ label: 'Ir', type: 'url' }] },
		});
		expect(missingUrl.success).toBe(false);
	});

	it('requires a headline on the hero and content on rich text', () => {
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_hero', item: {} }).success).toBe(false);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_richtext', item: { content: '' } }).success).toBe(
			false,
		);
		expect(
			cmsPageBlockInputSchema.safeParse({ collection: 'block_richtext', item: { content: '<p>oi</p>', alignment: 'center' } })
				.success,
		).toBe(true);
	});

	it('validates gallery files, pricing cards, post and event filters and the form reference', () => {
		expect(
			cmsPageBlockInputSchema.safeParse({ collection: 'block_gallery', item: { items: [{ file: uuid }] } }).success,
		).toBe(true);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_gallery', item: { items: [{ file: 'x' }] } }).success).toBe(
			false,
		);
		expect(
			cmsPageBlockInputSchema.safeParse({
				collection: 'block_pricing',
				item: { cards: [{ title: 'Básico', price: 'R$ 0', features: ['Ingressos'], is_highlighted: true }] },
			}).success,
		).toBe(true);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_posts', item: { limit: 0 } }).success).toBe(false);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_posts', item: { limit: 3 } }).success).toBe(true);
		expect(
			cmsPageBlockInputSchema.safeParse({
				collection: 'block_events',
				item: { max_items: 6, filter_featured: true, filter_by_category: uuid },
			}).success,
		).toBe(true);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_events', item: { max_items: 100 } }).success).toBe(false);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_form', item: { form: uuid } }).success).toBe(true);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_form', item: {} }).success).toBe(false);
		expect(cmsPageBlockInputSchema.safeParse({ collection: 'block_video', item: {} }).success).toBe(false);
	});
});

describe('cmsNavigationItemInputSchema', () => {
	it('demands the target that matches the link type', () => {
		expect(cmsNavigationItemInputSchema.safeParse({ title: 'Início', type: 'page', page: uuid }).success).toBe(true);
		expect(cmsNavigationItemInputSchema.safeParse({ title: 'Início', type: 'page' }).success).toBe(false);
		expect(cmsNavigationItemInputSchema.safeParse({ title: 'Blog', type: 'post', post: uuid }).success).toBe(true);
		expect(cmsNavigationItemInputSchema.safeParse({ title: 'Docs', type: 'url', url: 'https://ex.com' }).success).toBe(true);
		expect(cmsNavigationItemInputSchema.safeParse({ title: 'Docs', type: 'url', url: 'javascript:x' }).success).toBe(false);
		expect(cmsNavigationItemInputSchema.safeParse({ title: 'Mais', type: 'group' }).success).toBe(true);
		expect(cmsNavigationItemInputSchema.safeParse({ title: '', type: 'group' }).success).toBe(false);
	});
});

describe('cmsRedirectInputSchema', () => {
	it('accepts a relative source and a relative or absolute destination, defaulting to 301', () => {
		expect(cmsRedirectInputSchema.parse({ url_from: '/antigo', url_to: '/novo' })).toMatchObject({ response_code: '301' });
		expect(cmsRedirectInputSchema.safeParse({ url_from: '/antigo', url_to: 'https://ex.com/novo', response_code: '302' }).success).toBe(true);
		expect(cmsRedirectInputSchema.safeParse({ url_from: 'https://ex.com/antigo', url_to: '/novo' }).success).toBe(false);
		expect(cmsRedirectInputSchema.safeParse({ url_from: '/x', url_to: '/x' }).success).toBe(false);
		expect(cmsRedirectInputSchema.safeParse({ url_from: '/x', url_to: 'javascript:alert(1)' }).success).toBe(false);
	});
});

describe('cmsPostInputSchema', () => {
	it('requires title and slug and bounds the summary', () => {
		const parsed = cmsPostInputSchema.parse({ title: 'Novidades', slug: 'novidades' });
		expect(parsed).toMatchObject({ status: 'draft', published_at: null });
		expect(issuePaths(cmsPostInputSchema.safeParse({ title: 'x', slug: 'Novo Post' }))).toContain('slug');
		expect(issuePaths(cmsPostInputSchema.safeParse({ title: 'x', slug: 'x', description: 'd'.repeat(301) }))).toContain(
			'description',
		);
	});
});

describe('cmsFormInputSchema', () => {
	it('validates fields with machine names and choices where the type needs them', () => {
		const result = cmsFormInputSchema.safeParse({
			title: 'Contato',
			fields: [
				{ name: 'nome', type: 'text', label: 'Nome', required: true },
				{ name: 'assunto', type: 'select', label: 'Assunto', choices: [{ text: 'Dúvida', value: 'duvida' }] },
			],
		});
		expect(result.success).toBe(true);

		expect(
			cmsFormInputSchema.safeParse({ title: 'Contato', fields: [{ name: 'Nome Completo', type: 'text', label: 'x' }] })
				.success,
		).toBe(false);
		expect(
			cmsFormInputSchema.safeParse({ title: 'Contato', fields: [{ name: 'assunto', type: 'select', label: 'x' }] }).success,
		).toBe(false);
		expect(
			cmsFormInputSchema.safeParse({
				title: 'Contato',
				fields: [
					{ name: 'nome', type: 'text', label: 'x' },
					{ name: 'nome', type: 'text', label: 'y' },
				],
			}).success,
		).toBe(false);
	});

	it('requires a destination when the form redirects on success', () => {
		expect(cmsFormInputSchema.safeParse({ title: 'x', on_success: 'redirect', fields: [] }).success).toBe(false);
		expect(
			cmsFormInputSchema.safeParse({ title: 'x', on_success: 'redirect', success_redirect_url: '/obrigado', fields: [] })
				.success,
		).toBe(true);
	});
});

describe('cmsSiteSettingsInputSchema', () => {
	it('validates the public identity of the site', () => {
		expect(
			cmsSiteSettingsInputSchema.safeParse({
				title: 'Events Manager',
				description: 'Plataforma',
				url: 'https://events.local',
				accent_color: '#6644ff',
				social_links: [{ service: 'instagram', url: 'https://instagram.com/events' }],
				favicon: uuid,
				default_og_image: null,
			}).success,
		).toBe(true);
		expect(issuePaths(cmsSiteSettingsInputSchema.safeParse({ title: 'x', accent_color: 'roxo' }))).toContain('accent_color');
		expect(issuePaths(cmsSiteSettingsInputSchema.safeParse({ title: 'x', url: 'events.local' }))).toContain('url');
		expect(
			issuePaths(cmsSiteSettingsInputSchema.safeParse({ title: 'x', social_links: [{ service: 'orkut', url: 'https://a.b' }] })),
		).toContain('social_links.0.service');
	});
});
