import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefaultEventPage } from './DefaultEventPage';
import { eventPageTicket, publicEventFixture as event } from '@/test/event-page-fixtures';
vi.mock('next/link', () => ({
	default: ({ children, ...props }: { children: ReactNode; href: string }) => <a {...props}>{children}</a>,
}));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
const now = Date.parse('2026-11-19T12:00:00Z');

describe('standard event purchase page', () => {
	it('shows the cover, complete event information, organizer contacts and a working checkout link', async () => {
		render(<DefaultEventPage event={event} now={now} />);
		expect(screen.getByRole('heading', { level: 1, name: event.title })).toBeVisible();
		expect(screen.getByRole('img', { name: event.cover_image_alt })).toBeVisible();
		expect(screen.getByText('Dois dias de conversas e novas experiências.')).toBeVisible();
		expect(screen.getAllByText('Pavilhão Central').length).toBeGreaterThan(0);
		expect(screen.getByText('Rua das Flores, 10')).toBeVisible();
		expect(screen.getByText(/500 participantes/)).toBeVisible();
		expect(screen.getByRole('link', { name: 'contato@example.test' })).toHaveAttribute(
			'href',
			'mailto:contato@example.test',
		);
		expect(
			screen
				.getAllByRole('link', { name: /Comprar ingressos/ })
				.every((link) => link.getAttribute('href') === '/eventos/encontro/checkout'),
		).toBe(true);
		expect(screen.getAllByText(/R\$\s*210,00/).length).toBeGreaterThan(0);
		await userEvent.setup().click(screen.getByText('Condições deste ingresso'));
		expect(screen.getByText(/quit.*integral/i)).toBeVisible();
	});
	it('lists ticket descriptions and limits and does not advertise unavailable tickets at the lowest price', () => {
		render(
			<DefaultEventPage
				event={{
					...event,
					tickets: [
						eventPageTicket,
						{ ...eventPageTicket, id: 'sold', title: 'Lote encerrado', price: 1, buyer_price: 1, quantity_sold: 100 },
					],
				}}
				now={now}
			/>,
		);
		const summary = screen.getByRole('complementary', { name: 'Sua experiência começa aqui' });
		expect(within(summary).getByText(/R\$\s*210,00/)).toBeVisible();
		expect(screen.getByText('Esgotado')).toBeVisible();
		expect(screen.getAllByText('Acesso aos dois dias.').length).toBe(2);
	});
	it('keeps free registration actionable', () => {
		render(
			<DefaultEventPage
				event={{ ...event, is_free: true, tickets: [{ ...eventPageTicket, price: 0, buyer_price: 0 }] }}
				now={now}
			/>,
		);
		expect(screen.getAllByRole('link', { name: /Inscrever-se grátis/ })[0]).toHaveAttribute(
			'href',
			'/eventos/encontro/checkout',
		);
	});
	it('shows an honest empty state with no checkout link when sales are closed', () => {
		render(<DefaultEventPage event={{ ...event, registration_end: '2026-11-18T12:00:00Z' }} now={now} />);
		expect(screen.getAllByText('Inscrições encerradas').length).toBeGreaterThan(0);
		expect(screen.queryByRole('link', { name: /Comprar ingressos/ })).not.toBeInTheDocument();
	});
	it('links to other events and omits the section when no other event is available', () => {
		const related = { ...event, id: 'event-2', title: 'Próximo encontro', slug: 'proximo-encontro' };
		const view = render(<DefaultEventPage event={event} relatedEvents={[related]} now={now} />);
		expect(screen.getByRole('heading', { name: 'Mais encontros com esta organização' })).toBeVisible();
		expect(screen.getByRole('link', { name: /Próximo encontro/ })).toHaveAttribute('href', '/eventos/proximo-encontro');
		view.rerender(<DefaultEventPage event={event} now={now} />);
		expect(screen.queryByRole('heading', { name: 'Mais encontros com esta organização' })).not.toBeInTheDocument();
	});
	it('supports translated descriptions and online or undecided venues without exposing private access links', () => {
		const view = render(
			<DefaultEventPage
				event={{
					...event,
					event_type: 'online',
					online_url: 'https://secret.test',
					description_en: '<p>Meet and connect.</p>',
				}}
				language="en"
				now={now}
			/>,
		);
		expect(screen.getByText('Meet and connect.')).toBeVisible();
		expect(screen.getByRole('heading', { name: 'Acesso online' })).toBeVisible();
		expect(screen.queryByText('Rua das Flores, 10')).not.toBeInTheDocument();
		expect(document.querySelector('a[href="https://secret.test"]')).toBeNull();
		view.rerender(<DefaultEventPage event={{ ...event, location_tbd: true }} now={now} />);
		expect(screen.getAllByText('Local a definir').length).toBeGreaterThan(0);
		expect(screen.queryByText('Rua das Flores, 10')).not.toBeInTheDocument();
	});
});

it('offers the video anchor and plays the presentation only on request', async () => {
	const view = render(<DefaultEventPage event={{ ...event, video_url: 'https://youtu.be/M7lc1UVf-VE' }} now={now} />);
	expect(
		within(screen.getByRole('navigation', { name: 'Explore o evento' })).getByRole('link', { name: 'Vídeo' }),
	).toHaveAttribute('href', '#video');
	expect(document.querySelector('#video')).toContainElement(
		screen.getByRole('heading', { name: 'Conheça o evento em vídeo' }),
	);
	expect(screen.queryByTitle(`Vídeo sobre ${event.title}`)).not.toBeInTheDocument();
	await userEvent.setup().click(screen.getByRole('button', { name: 'Assistir ao vídeo' }));
	expect(screen.getByTitle(`Vídeo sobre ${event.title}`)).toHaveAttribute(
		'src',
		'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1&rel=0',
	);
	expect(screen.getByRole('link', { name: /Abrir no YouTube/ })).toHaveAttribute(
		'href',
		'https://www.youtube.com/watch?v=M7lc1UVf-VE',
	);
	view.rerender(<DefaultEventPage event={{ ...event, video_url: 'https://example.test/invalid' }} now={now} />);
	expect(screen.queryByRole('link', { name: 'Vídeo' })).not.toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Conheça o evento em vídeo' })).not.toBeInTheDocument();
});
