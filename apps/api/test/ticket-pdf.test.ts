import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { getDocument, ImageKind, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PdfKitTicketRenderer } from '../src/infrastructure/tickets/pdfkit-ticket-renderer.js';
import type { AttendeeTicketNotice } from '../src/application/tickets/deliver-tickets.js';

const jsQR: typeof import('jsqr').default = createRequire(import.meta.url)('jsqr');

const ticket: AttendeeTicketNotice = {
	attendeeName: 'João da Conceição',
	attendeeEmail: 'joao@example.test',
	buyerName: 'Maria',
	eventTitle: 'Conferência de Jovens da UMADEB 2027',
	eventDate: '2027-11-21T18:00:00Z',
	locationName: 'Pavilhão de Eventos · Brasília',
	ticketCode: 'EVT-7BA8C1296F',
	ticketTypeTitle: 'Entrada inteira',
};

async function readPdf(data: Uint8Array) {
	const loading = getDocument({ data: new Uint8Array(data), useSystemFonts: false });
	const pdf = await loading.promise;
	try {
		const page = await pdf.getPage(1);
		const content = await page.getTextContent();
		const operations = await page.getOperatorList();
		const codes: string[] = [];
		for (let i = 0; i < operations.fnArray.length; i++) {
			if (operations.fnArray[i] !== OPS.paintImageXObject) continue;
			const image = await new Promise<{ width: number; height: number; kind: number; data: Uint8Array }>((resolve) =>
				page.objs.get(operations.argsArray[i][0], resolve),
			);
			const rgba = new Uint8ClampedArray(image.width * image.height * 4);
			if (image.kind === ImageKind.RGBA_32BPP) rgba.set(image.data);
			else if (image.kind === ImageKind.RGB_24BPP) {
				for (let p = 0; p < image.width * image.height; p++) {
					rgba.set(image.data.subarray(p * 3, p * 3 + 3), p * 4);
					rgba[p * 4 + 3] = 255;
				}
			} else continue;
			const code = jsQR(rgba, image.width, image.height)?.data;
			if (code) codes.push(code);
		}
		return {
			pages: pdf.numPages,
			codes,
			text: content.items
				.flatMap((item) => ('str' in item ? [item.str] : []))
				.join(' ')
				.replace(/\s+/g, ' '),
		};
	} finally {
		await loading.destroy();
	}
}

describe('PDF nominal do ingresso', () => {
	it('produces a readable single-page PDF with accented participant data, event and the actual entry code', async () => {
		const data = await new PdfKitTicketRenderer().render(ticket);
		const { pages, text, codes } = await readPdf(data);
		expect(pages).toBe(1);
		expect(codes).toEqual([ticket.ticketCode]);
		for (const value of [
			ticket.attendeeName,
			ticket.eventTitle,
			ticket.ticketTypeTitle,
			ticket.locationName,
			ticket.ticketCode,
			'21 de novembro de 2027',
			'15:00',
			'QR Code',
		]) {
			expect(text).toContain(value);
		}
		expect(data.byteLength).toBeLessThan(500_000);
	});

	it.each([null, 'invalid-date'])(
		'handles missing or invalid schedule (%s) and venue without inventing details',
		async (eventDate) => {
			const data = await new PdfKitTicketRenderer().render({
				...ticket,
				eventDate,
				locationName: null,
				ticketTypeTitle: null,
			});
			const { pages, text } = await readPdf(data);
			expect(pages).toBe(1);
			expect(text).toContain('Data a confirmar');
			expect(text).toContain('Consulte o local na página do evento');
			expect(text).not.toMatch(/null|undefined|Invalid Date/);
		},
	);

	it('keeps long event and participant names on the ticket without pushing the entry code to another page', async () => {
		const data = await new PdfKitTicketRenderer().render({
			...ticket,
			eventTitle: 'Conferência muito especial '.repeat(20),
			attendeeName: 'Maria da Conceição '.repeat(15),
			locationName: 'Pavilhão de Eventos '.repeat(30),
		});
		const { pages, text } = await readPdf(data);
		expect(pages).toBe(1);
		expect(text).toContain(ticket.ticketCode);
	});
});
