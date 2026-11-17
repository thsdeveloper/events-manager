import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MyTickets from './MyTickets';

describe('ticket printing', () => {
	it('prints event and participant data as text without executable HTML or access to the opener', async () => {
		const payload = '<img src=x onerror="alert(1)">';
		const printDocument = document.implementation.createHTMLDocument();
		const popup = { document: printDocument, opener: window, print: vi.fn() };
		vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
		const user = userEvent.setup();
		render(
			<MyTickets
				registrations={[
					{
						id: 'ticket',
						ticket_code: payload,
						quantity: 1,
						total_amount: 10,
						participant_name: payload,
						participant_email: 'ana@example.com',
						status: 'confirmed',
						payment_status: 'paid',
						date_created: '2026-11-01',
						event_id: {
							id: 'event',
							title: '</title>' + payload,
							slug: 'evento',
							event_date: '2026-12-01',
							location: payload,
						},
						ticket_type_id: { id: 'type', title: payload },
					},
				]}
			/>,
		);
		await user.click(screen.getByRole('button', { name: 'Ver Ingresso' }));
		await user.click(screen.getByRole('button', { name: 'Imprimir Ingresso' }));
		expect(printDocument.querySelectorAll('img, script, [onerror]')).toHaveLength(0);
		expect(printDocument.body.textContent).toContain(payload);
		expect(printDocument.title).toBe('Ingresso - </title>' + payload);
		expect(popup.opener).toBeNull();
		expect(popup.print).toHaveBeenCalledOnce();
	});
});
