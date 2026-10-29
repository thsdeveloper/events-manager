/**
 * Reenvio por ingresso: o participante recebe o próprio ingresso; quando o
 * ingresso é de quem comprou, o que sai é o recibo da compra.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { nominalTicket } from '../_lib/fixtures';
import { ResendEmailDialog } from './ResendEmailDialog';

describe('ResendEmailDialog', () => {
	it('tells the organizer the attendee will get her ticket', () => {
		renderWithProviders(<ResendEmailDialog open onOpenChange={vi.fn()} participant={nominalTicket()} />);

		expect(screen.getByText('bia@events.local')).toBeInTheDocument();
		expect(screen.getByText(/ingresso de Bia Lima/i)).toBeInTheDocument();
	});

	it('explains that the buyer receives the purchase receipt instead', () => {
		renderWithProviders(
			<ResendEmailDialog
				open
				onOpenChange={vi.fn()}
				participant={nominalTicket({ is_buyer: true, attendee_name: 'Ana Souza', attendee_email: 'ana@events.local' })}
			/>,
		);

		expect(screen.getByRole('heading', { name: /reenviar recibo da compra/i })).toBeInTheDocument();
	});

	it('cannot send anything to a ticket nobody was named on', () => {
		renderWithProviders(
			<ResendEmailDialog
				open
				onOpenChange={vi.fn()}
				participant={nominalTicket({ attendee_name: null, attendee_email: null })}
			/>,
		);

		expect(screen.getByRole('button', { name: /reenviar/i })).toBeDisabled();
	});
});
