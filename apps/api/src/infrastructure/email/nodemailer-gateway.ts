import nodemailer from 'nodemailer';
import type { EmailGateway } from '../../application/email/email-service.js';

export class NodemailerGateway implements EmailGateway {
	private readonly transport;

	constructor(config: { host: string; password?: string; port: number; secure: boolean; user?: string }) {
		this.transport = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
			connectionTimeout: 10_000,
		});
	}

	async send(input: { from: string; html: string; subject: string; text: string; to: string }) {
		const result = await this.transport.sendMail(input);
		return { messageId: result.messageId };
	}
}
