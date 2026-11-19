import nodemailer from 'nodemailer';
import type { EmailGateway, EmailMessage } from '../../application/email/email-service.js';

export class NodemailerGateway implements EmailGateway {
	private readonly transport;

	constructor(config: { host: string; password?: string; port: number; secure: boolean; user?: string }) {
		this.transport = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
			connectionTimeout: 10_000,
			greetingTimeout: 10_000,
			socketTimeout: 20_000,
		});
	}

	async send(input: EmailMessage) {
		const result = await this.transport.sendMail({
			...input,
			attachments: input.attachments?.map((attachment) => ({
				filename: attachment.filename,
				contentType: attachment.contentType,
				content: Buffer.from(attachment.content),
				contentDisposition: 'attachment' as const,
			})),
		});
		return { messageId: result.messageId };
	}
}
