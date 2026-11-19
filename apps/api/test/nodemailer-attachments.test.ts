import nodemailer from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';
import { NodemailerGateway } from '../src/infrastructure/email/nodemailer-gateway.js';

describe('SMTP attachments', () => {
	it('encodes the PDF as a downloadable MIME attachment while preserving the HTML and text bodies', async () => {
		const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
		vi.spyOn(nodemailer, 'createTransport').mockReturnValue(transport);
		const send = vi.spyOn(transport, 'sendMail');
		const gateway = new NodemailerGateway({ host: 'unused.example.test', port: 2525, secure: false });
		const content = new Uint8Array(Buffer.from('%PDF-1.7\nTicket\n%%EOF'));
		await gateway.send({
			from: 'sender@example.test',
			to: 'recipient@example.test',
			subject: 'Seu ingresso',
			html: '<p>PDF em anexo</p>',
			text: 'PDF em anexo',
			attachments: [{ filename: 'ingresso-EVT-1.pdf', contentType: 'application/pdf', content }],
		});
		const result = await send.mock.results[0].value;
		const raw = result.message.toString();
		expect(raw).toContain('Content-Type: application/pdf');
		expect(raw).toContain('Content-Disposition: attachment; filename=ingresso-EVT-1.pdf');
		expect(raw).toContain(Buffer.from(content).toString('base64'));
		expect(raw).toContain('Content-Type: text/plain');
		expect(raw).toContain('Content-Type: text/html');
	});
});
