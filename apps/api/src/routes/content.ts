import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ContentService } from '../application/content/content-service.js';
import type { ApiEnv } from '../config/env.js';
import { FormUnavailable, InvalidFormSubmission, SubmitForm } from '../application/content/submit-form.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseContentRepository } from '../infrastructure/supabase/content-repository.js';
import { SupabaseFormSubmissionRepository } from '../infrastructure/supabase/form-submission-repository.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { ApiError } from '../shared/errors.js';
import { readAccessToken, requireUser } from './auth-context.js';

export async function contentRoutes(app: FastifyInstance, options: { clients: SupabaseClients; env: ApiEnv }) {
	const { clients, env } = options;
	const auth = createSupabaseAuthService(clients);
	const content = new ContentService(new SupabaseContentRepository(clients.admin), { previewSecret: env.COOKIE_SECRET });
	const submitForm = new SubmitForm(new SupabaseFormSubmissionRepository(clients.admin));
	const enforceRateLimit = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));

	app.get('/api/content/site', () => content.getSite());

	app.get('/api/content/fees', () => content.getFees());

	app.get('/api/content/pages', async (request) => {
		const query = z
			.object({
				permalink: z.string().default('/'),
				page: z.coerce.number().int().positive().default(1),
				preview: z.string().max(200).optional(),
			})
			.parse(request.query);
		return content.getPage(query.permalink, query.page, query.preview);
	});

	app.get('/api/content/posts/:slug', async (request) => {
		const { slug } = z.object({ slug: z.string() }).parse(request.params);
		return content.getPost(slug);
	});

	app.get('/api/content/posts', async (request) => {
		const query = z
			.object({
				limit: z.coerce.number().int().min(1).max(100).default(6),
				page: z.coerce.number().int().positive().default(1),
			})
			.parse(request.query);
		return content.listPosts(query.limit, query.page);
	});

	app.get('/api/content/redirects', () => content.getRedirects());

	app.get('/api/content/sitemap', () => content.getSitemap());

	app.post('/api/forms/:formId/submissions', async (request, reply) => {
		const { formId } = z.object({ formId: z.string().uuid() }).parse(request.params);
		try {
			await enforceRateLimit.execute({
				scope: `form:${formId}`,
				subject: request.ip,
				limit: 5,
				windowSeconds: 60,
			});
		} catch (error) {
			if (error instanceof RateLimitExceeded) {
				throw new ApiError('Muitas tentativas. Aguarde um minuto e tente novamente.', 429, 'RATE_LIMITED');
			}
			throw error;
		}
		const body = z
			.object({
				values: z
					.array(
						z.object({
							field: z.string().uuid(),
							value: z.string().max(10_000).optional(),
							file: z.string().uuid().optional(),
						}),
					)
					.max(100),
			})
			.parse(request.body);
		const accessToken = readAccessToken(request);
		const userId = accessToken ? (await requireUser(request, auth)).user.id : null;
		try {
			const id = await submitForm.execute(formId, userId, body.values);
			return reply.code(201).send({ success: true, id });
		} catch (error) {
			if (error instanceof FormUnavailable) {
				throw new ApiError('Formulário não encontrado ou indisponível.', 404, 'FORM_NOT_FOUND');
			}
			if (error instanceof InvalidFormSubmission) {
				throw new ApiError(error.message, 422, 'INVALID_FORM_SUBMISSION');
			}
			throw error;
		}
	});

	app.get('/api/search', async (request) => {
		const parsed = z
			.object({ q: z.string().max(100).optional(), search: z.string().max(100).optional() })
			.parse(request.query);
		const q = (parsed.q ?? parsed.search ?? '').trim();
		return content.search(q);
	});
}
