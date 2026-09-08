import { screen, waitFor, within } from '@testing-library/react';
import type { AppUser } from '@events-manager/contracts';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, problemResponse, renderWithProviders } from '@/test';
import { OrganizerLanding } from './OrganizerLanding';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

afterEach(() => vi.unstubAllGlobals());

const complete: AppUser & { email: string } = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: 'media-1',
	birth_date: '1990-05-20',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-09-04T19:00:00.000Z',
	location: 'Uberlândia - MG',
	description: 'Gosto de festivais.',
};

function renderLanding(user = complete) {
	// The fee simulator asks the platform rates; a visitor gets the published defaults.
	mockFetch([['/api/admin/event-configurations', () => problemResponse(401, 'UNAUTHORIZED')]]);

	return renderWithProviders(<OrganizerLanding user={user} />);
}

describe('OrganizerLanding', () => {
	it('sends a person with a complete profile straight to the request, from more than one place', () => {
		renderLanding();

		const links = screen.getAllByRole('link', { name: /quero vender ingressos/i });
		expect(links.length).toBeGreaterThanOrEqual(2);
		for (const link of links) expect(link).toHaveAttribute('href', '/perfil/organizador/novo');
		expect(screen.queryByRole('link', { name: /completar meu cadastro/i })).not.toBeInTheDocument();
		expect(screen.getByText(/cadastro completo/i)).toBeInTheDocument();
	});

	it('holds the request back while the profile is incomplete and shows exactly what is missing', () => {
		renderLanding({ ...complete, document: null, phone_verified_at: null });

		expect(screen.queryByRole('link', { name: /quero vender ingressos/i })).not.toBeInTheDocument();
		const ctas = screen.getAllByRole('link', { name: /completar meu cadastro/i });
		expect(ctas.length).toBeGreaterThanOrEqual(2);
		for (const link of ctas) expect(link).toHaveAttribute('href', '/perfil?section=personal');

		const pending = screen.getByRole('list', { name: /o que falta no seu cadastro/i });
		expect(
			within(pending)
				.getAllByRole('listitem')
				.map((item) => item.textContent),
		).toEqual(['CPF', 'Telefone confirmado']);
		expect(screen.getByText(/faltam 2 itens/i)).toBeInTheDocument();
	});

	it('marks the first step as done once the profile is complete', () => {
		renderLanding();

		const steps = screen.getByRole('list', { name: /como funciona/i });
		const first = within(steps).getAllByRole('listitem')[0];
		expect(first).toHaveTextContent(/complete seu cadastro/i);
		expect(first).toHaveTextContent(/concluído/i);
	});

	it('points to the fees page instead of embedding the calculator', () => {
		renderLanding();

		expect(screen.queryByLabelText(/valor do ingresso/i)).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /calcular minhas taxas/i })).toHaveAttribute('href', '/taxas');
	});

	it('stretches the fee banner edge to edge while its content stays inside the header container', () => {
		const { container } = renderLanding();

		const banner = screen.getByRole('heading', { name: /quanto sobra para você em cada ingresso/i }).closest('section');
		expect(banner).not.toBeNull();
		// A cor vai de ponta a ponta na section; o container fica por dentro dela.
		expect(banner?.className).not.toMatch(/\bmax-w-7xl\b/);
		expect(banner?.querySelector('.max-w-7xl')).not.toBeNull();
		expect(container.querySelector('.max-w-7xl')).not.toBeNull();
	});

	it('stretches the final call to action edge to edge with its content inside the header container', () => {
		renderLanding({ ...complete, document: null });

		const heading = screen.getByRole('heading', { name: /faltam só 1 item do seu cadastro/i });
		const banner = heading.closest('section');
		expect(banner).not.toBeNull();
		expect(banner?.className).not.toMatch(/\bmax-w-7xl\b/);
		expect(banner?.querySelector('.max-w-7xl')).not.toBeNull();
		expect(within(banner as HTMLElement).getByText(/^quase lá$/i)).toBeInTheDocument();
	});

	it('keeps the page inside the same container as the header', () => {
		const { container } = renderLanding();

		const wrapper = container.querySelector('.max-w-7xl');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.className).toMatch(/\bpx-4\b/);
	});

	it('opens straight on the headline, without an audience badge above it', () => {
		renderLanding();

		expect(screen.queryByText(/para quem organiza eventos/i)).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/venda ingressos/i);
	});

	it('shows the hero illustration as decoration only, keeping the readiness card on the page', () => {
		const { container } = renderLanding();

		const illustration = container.querySelector('img[src*="organizer"][src*="hero"]');
		expect(illustration).not.toBeNull();
		expect(illustration).toHaveAttribute('alt', '');
		expect(illustration).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByRole('heading', { name: /cadastro completo, ana/i })).toBeInTheDocument();
	});

	it('presents the fee simulator under a banner with the animated safe and the market claim', () => {
		const { container } = renderLanding();

		const video = container.querySelector('video[src*="safe"]');
		expect(video).not.toBeNull();
		expect(video).toHaveAttribute('aria-hidden', 'true');
		expect(video).toHaveAttribute('loop');
		expect(video).toHaveAttribute('playsinline');
		expect((video as HTMLVideoElement).muted).toBe(true);
		expect(screen.getByText(/mais baixa do mercado/i)).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /quanto sobra para você em cada ingresso/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /calcular minhas taxas/i })).toHaveAttribute('href', '/taxas');
	});
});
