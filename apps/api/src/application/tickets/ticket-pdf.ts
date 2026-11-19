import type { AttendeeTicketNotice } from './deliver-tickets.js';

/** Gera o ingresso nominal para anexar ao e-mail, sem persistir o arquivo. */
export interface TicketPdfRenderer {
	render(ticket: AttendeeTicketNotice): Promise<Uint8Array>;
}
