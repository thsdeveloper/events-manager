import { renderAsOwner } from '@/test/permissions';
/**
 * Detalhe de um ingresso nominal: quem vai, o pedido de quem comprou (com o
 * comprovante), o evento e o check-in daquela unidade.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '@/test';
import { nominalTicket } from '../_lib/fixtures';
import ParticipantDetailsPage from './page';

// O roteador precisa ser estável: a página o lista como dependência do efeito
// que carrega o ingresso.
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
	useParams: () => ({ id: 't-1' }),
	useRouter: () => router,
}));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('ParticipantDetailsPage', () => {
	it('shows the attendee, the order behind the ticket and the receipt', async () => {
		mockFetch([
			[
				'/api/admin/participantes/t-1',
				() =>
					jsonResponse({
						success: true,
						data: nominalTicket({
							registration: { ...nominalTicket().registration, receipt_url: 'https://pay.test/receipt/1' },
						}),
					}),
			],
		]);

		renderAsOwner(<ParticipantDetailsPage />);

		expect(await screen.findByRole('heading', { name: 'Bia Lima' })).toBeInTheDocument();
		expect(screen.getByText(/comprado por/i)).toBeInTheDocument();
		expect(screen.getByText('Ana Souza')).toBeInTheDocument();
		expect(screen.getByText('Ingresso 2 de 5')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /comprovante/i })).toHaveAttribute('href', 'https://pay.test/receipt/1');
		expect(screen.queryByText(/informações adicionais/i)).not.toBeInTheDocument();
	});

	it('names a pending ticket as such and offers to fill it in', async () => {
		mockFetch([
			[
				'/api/admin/participantes/t-1',
				() => jsonResponse({ success: true, data: nominalTicket({ attendee_name: null, attendee_email: null }) }),
			],
		]);

		renderAsOwner(<ParticipantDetailsPage />);

		expect(await screen.findByRole('heading', { name: 'Participante a informar' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /informar participante/i }).length).toBeGreaterThan(0);
	});
});
