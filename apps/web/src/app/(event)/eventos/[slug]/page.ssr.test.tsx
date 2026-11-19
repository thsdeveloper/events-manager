import { buildDefaultEventPageLayout, type Event } from '@events-manager/contracts';
/**
 * Página pública do evento. A escolha de ingressos acontece no checkout: aqui a
 * pessoa consulta informações e condições dos ingressos antes de comprar.
 * A seleção de quantidades e participantes continua exclusiva do checkout.
 */
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventPage, { generateMetadata } from './page';

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
vi.mock('next/navigation', () => ({
	notFound: () => {
		throw new Error('not found');
	},
}));
vi.mock('@/components/map/EventLocationView', () => ({ EventLocationView: () => <div>mapa</div> }));

const fetchEventBySlug = vi.fn();
const fetchOrganizationEvents = vi.fn().mockResolvedValue([]);
beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-09-18T12:00:00Z'));
});
vi.mock('@/lib/content/fetchers', () => ({
	fetchEventBySlug: (slug: string) => fetchEventBySlug(slug),
	fetchOrganizationEvents: (organizerId: string, excludeId: string) => fetchOrganizationEvents(organizerId, excludeId),
	fetchSiteData: async () => ({
		globals: { title: 'Flouvi' },
		headerNavigation: { items: [] },
		footerNavigation: { items: [] },
	}),
}));
// A casca do site (menu e rodapé) só entra no layout padrão; a landing do organizador vive sem ela.
vi.mock('@/components/layout/SiteLayout', () => ({
	default: ({ children }: { children: ReactNode }) => <div data-site-layout>{children}</div>,
}));

const event = {
	id: 'e-1',
	organizer_id: 'org-1',
	slug: 'congresso',
	title: 'Congresso de Jovens',
	description: '<p>Três dias de encontros.</p>',
	short_description: 'Encontro anual.',
	start_date: '2026-09-19T12:00:00.000Z',
	end_date: '2026-09-21T21:00:00.000Z',
	event_type: 'in_person',
	is_free: false,
	status: 'published',
	location_name: 'Ginásio Central',
	tickets: [
		{
			id: 't-1',
			title: 'Meia Entrada',
			description: 'Para estudantes',
			status: 'active',
			quantity: 100,
			quantity_sold: 17,
			price: 345,
			buyer_price: 362.25,
		},
	],
};

async function renderPage() {
	fetchEventBySlug.mockResolvedValue(event);

	return renderToStaticMarkup(await EventPage({ params: Promise.resolve({ slug: 'congresso' }) }));
}

describe('EventPage', () => {
	it('shows ticket conditions and sends the buyer to checkout to select quantities', async () => {
		const markup = await renderPage();

		expect(markup).toMatch(/<a[^>]*href="\/eventos\/congresso\/checkout"[^>]*>[^<]*Comprar ingressos/);
		expect(markup).toContain('Meia Entrada');
		expect(markup).toContain('Para estudantes');
		expect(markup).not.toContain('Selecionar');
		expect(markup).not.toMatch(/<h2[^>]*>(?:(?!<\/h2>).)*Ingressos<\/span>/);
	});

	it('still tells the story of the event', async () => {
		const markup = await renderPage();

		expect(markup).toContain('Sobre o evento');
		expect(markup).toContain('Encontro anual.');
		expect(markup).toContain('Ingressos a partir de');
	});

	it('describes the page for search engines with plain text, never with the editor\u2019s HTML', async () => {
		fetchEventBySlug.mockResolvedValue({
			...event,
			short_description: null,
			description: '<p>Três dias de <strong>encontros</strong> e <a href="/x">oficinas</a>.</p>',
		});

		const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'congresso' }) });

		expect(metadata.description).toBe('Três dias de encontros e oficinas.');
	});

	it('wraps the standard layout in the site shell when the organizer has no custom page', async () => {
		const markup = await renderPage();

		expect(markup).toContain('data-site-layout');
		expect(markup).not.toContain('data-landing');
	});

	it('renders the organizer\u2019s landing page alone, without the site header, when one is published', async () => {
		fetchEventBySlug.mockResolvedValue({
			...event,
			page: buildDefaultEventPageLayout(event as unknown as Event),
		});

		const markup = renderToStaticMarkup(await EventPage({ params: Promise.resolve({ slug: 'congresso' }) }));

		expect(markup).toContain('data-theme="light"');
		expect(markup).toContain('Três dias de encontros.');
		expect(markup).not.toContain('data-site-layout');
		expect(markup).toContain('href="/eventos/congresso/checkout"');
	});
});

describe('conteúdo adicional do evento', () => {
	it('renders the selected translation and falls back to Portuguese', async () => {
		fetchEventBySlug.mockResolvedValue({ ...event, description_en: '<p>English programme.</p>' });
		const english = renderToStaticMarkup(
			await EventPage({
				params: Promise.resolve({ slug: 'congresso' }),
				searchParams: Promise.resolve({ lang: 'en' }),
			} as never),
		);
		expect(english).toContain('English programme.');
		const spanish = renderToStaticMarkup(
			await EventPage({
				params: Promise.resolve({ slug: 'congresso' }),
				searchParams: Promise.resolve({ lang: 'es' }),
			} as never),
		);
		expect(spanish).toContain('Três dias de encontros.');
	});
	it('shows an undefined venue without stale location or coordinates', async () => {
		fetchEventBySlug.mockResolvedValue({
			...event,
			location_tbd: true,
			latitude: -15,
			longitude: -47,
			location_name: 'Local antigo',
		});
		const markup = renderToStaticMarkup(await EventPage({ params: Promise.resolve({ slug: 'congresso' }) }));
		expect(markup).toContain('Local a definir');
		expect(markup).not.toContain('Local antigo');
		expect(markup).not.toContain('mapa');
	});
	it('honours the option to hide the map', async () => {
		fetchEventBySlug.mockResolvedValue({ ...event, show_map: false, latitude: -15, longitude: -47 });
		expect(renderToStaticMarkup(await EventPage({ params: Promise.resolve({ slug: 'congresso' }) }))).not.toContain(
			'mapa',
		);
	});
});
