/**
 * Landing page do evento, montada pelo organizador. Renderiza no servidor a
 * partir do layout publicado: cabeçalho próprio com navegação por âncoras,
 * seções na ordem escolhida (as ocultas ficam de fora) e a seção de ingressos,
 * que leva ao checkout. Em pré-visualização nada navega.
 */
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildDefaultEventPageLayout, type Event, type EventPageLayout } from '@events-manager/contracts';
import { EventLandingPage } from './EventLandingPage';

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
vi.mock('@/components/map/EventLocationView', () => ({ EventLocationView: () => <div>mapa</div> }));

const MEDIA = '00000000-0000-4000-8000-000000000051';

const event = {
	id: 'e-1',
	title: 'Congresso de Jovens',
	slug: 'congresso',
	description: '<p>Três dias de encontros.</p>',
	short_description: 'Encontro anual.',
	start_date: '2026-09-19T12:00:00.000Z',
	end_date: '2026-09-21T21:00:00.000Z',
	event_type: 'in_person',
	location_name: 'Ginásio Central',
	location_address: 'Rua A, 10',
	latitude: -15.8,
	longitude: -47.9,
	is_free: false,
	cover_image: { id: MEDIA, bucket: 'media', path: 'capa.png' },
	organizer_id: { id: 'org-1', name: 'ADEB', email: 'contato@adeb.org', logo: null, website: 'https://adeb.org' },
	tickets: [
		{
			id: 't-1',
			title: 'Meia Entrada',
			price: 100,
			buyer_price: 105,
			quantity: 100,
			quantity_sold: 10,
			status: 'active',
		},
		{ id: 't-2', title: 'Inteira', price: 200, buyer_price: 210, quantity: 50, quantity_sold: 50, status: 'active' },
	],
} as unknown as Event;

function layout(overrides: (layout: EventPageLayout) => void = () => {}) {
	const base = buildDefaultEventPageLayout(event);
	overrides(base);

	return base;
}

describe('EventLandingPage', () => {
	it('renders the organizer header with anchor navigation and the hero from the event', () => {
		const markup = renderToStaticMarkup(<EventLandingPage event={event} layout={layout()} />);

		expect(markup).toMatch(
			/<header[^>]*>[\s\S]*<a[^>]*href="#sobre"[^>]*>Sobre<\/a>[\s\S]*<a[^>]*href="#ingressos"[^>]*>Ingressos<\/a>/,
		);
		expect(markup).toMatch(/<h1[^>]*>Congresso de Jovens<\/h1>/);
		expect(markup).toContain('Encontro anual.');
		expect(markup).toContain('Ginásio Central');
		expect(markup).toMatch(/<section[^>]*id="sobre"/);
		expect(markup).toContain('Três dias de encontros.');
	});

	it('lists the ticket types with prices, marks the sold out one and sends buyers to the checkout', () => {
		const markup = renderToStaticMarkup(<EventLandingPage event={event} layout={layout()} />);

		expect(markup).toMatch(/<section[^>]*id="ingressos"/);
		expect(markup).toContain('Meia Entrada');
		expect(markup).toMatch(/R\$\s?105,00/);
		expect(markup).toMatch(/Inteira[\s\S]*Esgotado/);
		expect(markup).toMatch(/<a[^>]*href="\/eventos\/congresso\/checkout"[^>]*>Comprar ingressos<\/a>/);
	});

	it('skips hidden sections and renders the optional ones the organizer added', () => {
		const markup = renderToStaticMarkup(
			<EventLandingPage
				event={event}
				layout={layout((current) => {
					current.sections[1].hidden = true;
					current.sections.push(
						{
							id: 'faq',
							anchor: 'faq',
							hidden: false,
							type: 'faq',
							title: 'Perguntas frequentes',
							items: [{ id: 'q1', question: 'Tem estacionamento?', answer: 'Sim, gratuito.' }],
						},
						{
							id: 'sp',
							anchor: 'palestrantes',
							hidden: false,
							type: 'speakers',
							title: 'Palestrantes',
							items: [{ id: 's1', name: 'Ana Lima', role: 'CTO', photo: null, bio: '' }],
						},
						{ id: 'cd', anchor: 'contagem', hidden: false, type: 'countdown', title: 'Falta pouco' },
						{ id: 'lc', anchor: 'local', hidden: false, type: 'location', title: 'Local', showMap: true },
					);
				})}
			/>,
		);

		expect(markup).not.toContain('Três dias de encontros.');
		expect(markup).toMatch(/<section[^>]*id="faq"[\s\S]*Tem estacionamento\?[\s\S]*Sim, gratuito\./);
		expect(markup).toMatch(/<section[^>]*id="palestrantes"[\s\S]*Ana Lima[\s\S]*CTO/);
		expect(markup).toMatch(/<section[^>]*id="contagem"/);
		expect(markup).toMatch(/<section[^>]*id="local"[\s\S]*Rua A, 10[\s\S]*mapa/);
	});

	it('applies the dark theme and the accent color the organizer picked', () => {
		const markup = renderToStaticMarkup(
			<EventLandingPage
				event={event}
				layout={layout((current) => {
					current.theme = { mode: 'dark', accent: '#ff5500' };
				})}
			/>,
		);

		expect(markup).toMatch(/data-theme="dark"/);
		expect(markup).toContain('--landing-accent:#ff5500');
	});

	it('keeps the buyer inside the preview: no navigation from anchors or the purchase button', () => {
		const markup = renderToStaticMarkup(<EventLandingPage event={event} layout={layout()} mode="preview" />);

		expect(markup).not.toContain('href="/eventos/congresso/checkout"');
		expect(markup).not.toContain('href="#ingressos"');
		expect(markup).toContain('Comprar ingressos');
	});

	it('shows the organizer in the footer, and hides it when asked', () => {
		const withOrganizer = renderToStaticMarkup(<EventLandingPage event={event} layout={layout()} />);
		const without = renderToStaticMarkup(
			<EventLandingPage
				event={event}
				layout={layout((current) => {
					current.footer = { showOrganizer: false, note: 'Realização própria.' };
				})}
			/>,
		);

		expect(withOrganizer).toMatch(/<footer[\s\S]*ADEB/);
		expect(without).not.toMatch(/<footer[\s\S]*ADEB/);
		expect(without).toContain('Realização própria.');
	});
});
