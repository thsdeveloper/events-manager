import type { ReactNode } from 'react';
import type { PageBlock } from '@events-manager/contracts';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import PageBuilder from '@/components/layout/PageBuilder';

vi.mock('next/link', () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));

const latest = {
	id: 'latest',
	title: 'Workshop de aprendizado de máquinas',
	slug: 'workshop',
	short_description: 'O melhor workshop para aprender a qualificar as máquinas.',
	start_date: '2026-11-20T18:00:00-03:00',
	end_date: '2026-11-20T21:00:00-03:00',
	location_name: 'Teatro Nacional',
	event_type: 'in_person' as const,
	cover_image: 'https://example.test/event.png',
	cover_image_alt: 'Palestrantes do workshop',
};
const previous = {
	...latest,
	id: 'previous',
	title: 'Festival de música',
	slug: 'festival',
	short_description: 'Uma noite de música.',
	cover_image: 'https://example.test/festival.png',
	cover_image_alt: 'Artistas do festival',
};
const block = (patch = {}): PageBlock => ({
	id: 'highlight-block',
	collection: 'block_event_highlight',
	item: {
		id: 'highlight',
		display_mode: 'slider',
		max_items: 5,
		image_position: 'right',
		button_label: 'Comprar ingressos',
		events: [latest, previous],
		...patch,
	},
});

describe('automatic EventHighlight', () => {
	it('shows the latest event data, its artwork, date, location and event destination', () => {
		renderWithProviders(<PageBuilder sections={[block()]} />);
		const section = within(screen.getByRole('region', { name: 'Eventos recentes' }));
		expect(section.getByRole('heading', { level: 2, name: latest.title })).toBeInTheDocument();
		expect(section.getByText(latest.short_description)).toBeInTheDocument();
		expect(section.getByText(/20 de novembro.*18:00.*21:00.*Teatro Nacional/)).toBeInTheDocument();
		expect(section.getAllByRole('img')).toHaveLength(1);
		expect(section.getByRole('img', { name: latest.cover_image_alt })).toHaveAttribute('src', latest.cover_image);
		expect(section.getByRole('link', { name: 'Comprar ingressos' })).toHaveAttribute('href', '/eventos/workshop');
	});

	it('changes all displayed event data when navigating forward and back, looping at both ends', async () => {
		const { user } = renderWithProviders(<PageBuilder sections={[block()]} />);
		await user.click(screen.getByRole('button', { name: 'Próximo evento' }));
		expect(screen.getByRole('heading', { name: previous.title })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: latest.title })).not.toBeInTheDocument();
		expect(screen.getByText(previous.short_description)).toBeInTheDocument();
		expect(screen.getByRole('img', { name: previous.cover_image_alt })).toHaveAttribute('src', previous.cover_image);
		expect(screen.getByRole('link', { name: 'Comprar ingressos' })).toHaveAttribute('href', '/eventos/festival');
		expect(screen.getByRole('status')).toHaveTextContent('Evento 2 de 2');
		await user.click(screen.getByRole('button', { name: 'Próximo evento' }));
		expect(screen.getByRole('heading', { name: latest.title })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Evento anterior' }));
		expect(screen.getByRole('heading', { name: previous.title })).toBeInTheDocument();
	});

	it.each([{ display_mode: 'single' }, { events: [latest] }])(
		'omits navigation when only one event should be shown (%j)',
		(patch) => {
			renderWithProviders(<PageBuilder sections={[block(patch)]} />);
			expect(screen.getByRole('heading', { name: latest.title })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Próximo evento' })).not.toBeInTheDocument();
		},
	);

	it('omits the section when there are no public events', () => {
		renderWithProviders(<PageBuilder sections={[block({ events: [] })]} />);
		expect(screen.queryByRole('region', { name: 'Eventos recentes' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('handles events without images and describes online locations', () => {
		renderWithProviders(
			<PageBuilder
				sections={[
					block({
						events: [
							{ ...latest, cover_image: null, short_description: null, event_type: 'online', location_name: null },
						],
					}),
				]}
			/>,
		);
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
		expect(screen.getByText(/Evento online/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Comprar ingressos' })).toHaveAttribute('href', '/eventos/workshop');
	});

	it('uses the event title as alternative text and stays valid when the event list shrinks', async () => {
		const { user, rerender } = renderWithProviders(<PageBuilder sections={[block()]} />);
		await user.click(screen.getByRole('button', { name: 'Próximo evento' }));
		rerender(<PageBuilder sections={[block({ events: [{ ...latest, cover_image_alt: null }] })]} />);
		expect(screen.getByRole('img', { name: latest.title })).toBeInTheDocument();
	});
});
