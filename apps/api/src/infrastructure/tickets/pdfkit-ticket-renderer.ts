import { readFile } from 'node:fs/promises';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { AttendeeTicketNotice } from '../../application/tickets/deliver-tickets.js';
import type { TicketPdfRenderer } from '../../application/tickets/ticket-pdf.js';
import { formatEventDate } from '../../application/tickets/format-event-date.js';

const colors = { violet: '#743DF5', plum: '#231A33', apricot: '#FFD09D', mist: '#F3EEFF', white: '#FFFFFF' };
const assets = new URL('../../../assets/tickets/', import.meta.url);

export class PdfKitTicketRenderer implements TicketPdfRenderer {
	async render(ticket: AttendeeTicketNotice): Promise<Uint8Array> {
		const [font, boldFont, logo, qr] = await Promise.all([
			readFile(new URL('dm-sans-regular.ttf', assets)),
			readFile(new URL('dm-sans-bold.ttf', assets)),
			readFile(new URL('flouvi.png', assets)),
			QRCode.toBuffer(ticket.ticketCode, {
				width: 480,
				margin: 4,
				errorCorrectionLevel: 'M',
				color: { dark: colors.plum, light: colors.white },
			}),
		]);
		const doc = new PDFDocument({
			size: 'A4',
			margin: 0,
			info: { Title: `Ingresso ${ticket.ticketCode}`, Author: 'Flouvi' },
		});
		doc.registerFont('regular', font).registerFont('bold', boldFont).font('regular');
		const chunks: Buffer[] = [];
		const output = new Promise<Uint8Array>((resolve, reject) => {
			doc.on('data', (chunk: Buffer) => chunks.push(chunk));
			doc.once('end', () => resolve(Buffer.concat(chunks)));
			doc.once('error', reject);
		});
		try {
			doc.image(logo, 40, 34, { width: 120 });
			doc.fillColor(colors.plum).fontSize(10).text('INGRESSO NOMINAL', 350, 47, { width: 205, align: 'right' });
			doc.roundedRect(40, 106, 515, 660, 16).lineWidth(1).stroke(colors.mist);
			doc.roundedRect(40, 106, 515, 152, 16).fill(colors.violet);
			doc.rect(40, 238, 515, 20).fill(colors.violet);
			doc.fillColor(colors.apricot).fontSize(9).text('SEU INGRESSO CHEGOU', 64, 124);
			doc
				.font('bold')
				.fillColor(colors.white)
				.fontSize(23)
				.text(ticket.eventTitle, 64, 149, { width: 467, height: 86, ellipsis: true });

			doc.font('regular').fillColor(colors.violet).fontSize(9).text('TIPO DE INGRESSO', 64, 278);
			doc
				.fillColor(colors.plum)
				.fontSize(14)
				.text(ticket.ticketTypeTitle ?? 'Ingresso', 64, 294, { width: 467, height: 38, ellipsis: true });
			doc.roundedRect(56, 337, 483, 80, 10).fill(colors.mist);
			doc.fillColor(colors.violet).fontSize(9).text('PARTICIPANTE', 70, 348);
			doc
				.font('bold')
				.fillColor(colors.plum)
				.fontSize(18)
				.text(ticket.attendeeName, 70, 366, { width: 455, height: 45, ellipsis: true });

			doc.font('regular').fillColor(colors.violet).fontSize(9).text('QUANDO · HORÁRIO DE BRASÍLIA', 64, 436);
			doc
				.fillColor(colors.plum)
				.fontSize(11)
				.text(formatEventDate(ticket.eventDate) ?? 'Data a confirmar', 64, 454, {
					width: 230,
					height: 48,
					ellipsis: true,
				});
			doc.fillColor(colors.violet).fontSize(9).text('ONDE', 323, 436);
			doc
				.fillColor(colors.plum)
				.fontSize(11)
				.text(ticket.locationName ?? 'Consulte o local na página do evento', 323, 454, {
					width: 208,
					height: 48,
					ellipsis: true,
				});

			doc.moveTo(52, 523).lineTo(543, 523).dash(4, { space: 4 }).stroke(colors.violet).undash();
			doc.circle(40, 523, 9).fill(colors.white);
			doc.circle(555, 523, 9).fill(colors.white);
			doc.image(qr, 64, 548, { width: 172, height: 172 });
			doc.fillColor(colors.violet).fontSize(17).text('Pronto para entrar', 260, 560, { width: 260 });
			doc
				.fillColor(colors.plum)
				.fontSize(11)
				.text('Apresente este QR Code na entrada do evento junto com um documento com foto.', 260, 592, {
					width: 255,
					height: 70,
				});
			doc.fontSize(9).text('CÓDIGO DO INGRESSO', 260, 669);
			doc.fontSize(12).text(ticket.ticketCode, 260, 687, { width: 255, height: 36 });
			doc
				.fontSize(9)
				.text('Válido para o participante identificado neste ingresso.', 64, 738, { width: 467, align: 'center' });
			doc
				.fillColor(colors.plum)
				.fontSize(9)
				.text('Guarde o PDF no celular para acessar mesmo sem internet.', 40, 790, { width: 515, align: 'center' });
			doc.end();
		} catch (error) {
			doc.destroy(error instanceof Error ? error : new Error(String(error)));
		}

		return output;
	}
}
