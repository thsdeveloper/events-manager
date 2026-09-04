import { CachedEmailBranding } from '../../application/email/email-branding.js';
import { EmailService } from '../../application/email/email-service.js';
import type { ApiEnv } from '../../config/env.js';
import { createEmailBrandingReader } from '../supabase/email-branding-repository.js';
import { SupabaseEmailDeliveryRepository } from '../supabase/email-delivery-repository.js';
import type { SupabaseClients } from '../supabase/clients.js';
import { NodemailerGateway } from './nodemailer-gateway.js';

/**
 * Composition of the e-mail stack, shared by every route that sends mail. It
 * lives in infrastructure because it wires the SMTP gateway and the Supabase
 * repositories — the application layer may not name either.
 *
 * `branding` is returned alongside the service because `/api/branding/logo`
 * reads it directly.
 */
export function createEmailService(env: ApiEnv, clients: SupabaseClients) {
	const branding = new CachedEmailBranding(createEmailBrandingReader(clients), env.WEB_URL);
	const email = new EmailService(
		new SupabaseEmailDeliveryRepository(clients),
		new NodemailerGateway({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			user: env.SMTP_USER,
			password: env.SMTP_PASSWORD,
		}),
		env.EMAIL_FROM,
		branding,
	);

	return { branding, email };
}
