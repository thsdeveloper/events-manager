import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSectionNavigation } from './EventSectionNavigation';

const links = [
	{ id: 'sobre', label: 'Sobre' },
	{ id: 'ingressos', label: 'Ingressos' },
	{ id: 'quando', label: 'Data e horário' },
	{ id: 'local', label: 'Local' },
	{ id: 'organizacao', label: 'Organização' },
];
function renderNavigation() {
	return render(
		<>
			<header data-site-header>Flouvi</header>
			<main>
				<EventSectionNavigation links={links} />
				{links.map((link) => (
					<section key={link.id} id={link.id}>
						<h2>{link.label}</h2>
					</section>
				))}
			</main>
		</>,
	);
}
beforeEach(() => window.history.replaceState(null, '', '/eventos/encontro'));
afterEach(() => vi.unstubAllGlobals());

describe('event section navigation', () => {
	it('keeps every destination as a native anchor to the corresponding event section', () => {
		renderNavigation();
		const nav = screen.getByRole('navigation', { name: 'Explore o evento' });
		for (const link of links)
			expect(within(nav).getByRole('link', { name: link.label })).toHaveAttribute('href', `#${link.id}`);
	});
	it('marks the section the visitor chooses without replacing native anchor navigation', async () => {
		const user = userEvent.setup();
		renderNavigation();
		const ticketLink = screen.getByRole('link', { name: 'Ingressos' });
		await user.click(ticketLink);
		await waitFor(() => expect(ticketLink).toHaveAttribute('aria-current', 'location'));
		expect(window.location.hash).toBe('#ingressos');
		await user.click(screen.getByRole('link', { name: 'Local' }));
		await waitFor(() => expect(ticketLink).not.toHaveAttribute('aria-current'));
		expect(screen.getByRole('link', { name: 'Local' })).toHaveAttribute('aria-current', 'location');
	});
	it('recognizes direct section links and follows browser history changes', () => {
		window.history.replaceState(null, '', '#organizacao');
		renderNavigation();
		expect(screen.getByRole('link', { name: 'Organização' })).toHaveAttribute('aria-current', 'location');
		act(() => {
			window.history.replaceState(null, '', '#quando');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});
		expect(screen.getByRole('link', { name: 'Data e horário' })).toHaveAttribute('aria-current', 'location');
		expect(screen.getByRole('link', { name: 'Organização' })).not.toHaveAttribute('aria-current');
	});
});
