import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { CheckoutMethod } from '../application/payments/payment-gateway.js';

const checkoutMethods: readonly CheckoutMethod[] = ['PIX', 'CARD', 'BOLETO'];

config({ path: resolve(process.cwd(), '../../.env') });
config();

const envSchema = z
	.object({
		NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
		// The deployment stage is independent of Node's production optimizations.
		APP_ENV: z.enum(['development', 'production']).default('production'),
		API_HOST: z.string().default('0.0.0.0'),
		API_PORT: z.coerce.number().int().positive().default(3333),
		TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
		WEB_URL: z.string().url().default('http://localhost:3003'),
		SUPABASE_URL: z.string().url().default('http://127.0.0.1:55321'),
		SUPABASE_ANON_KEY: z.string().min(1),
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
		COOKIE_SECRET: z.string().min(16).default('local-development-cookie-secret'),
		ABACATEPAY_API_KEY: z.string().optional(),
		ABACATEPAY_PUBLIC_KEY: z.preprocess(
			(value) => (value === '' ? undefined : value),
			z
				.string()
				.regex(/^pk_[A-Za-z0-9_-]+$/)
				.optional(),
		),
		ABACATEPAY_BASE_URL: z.string().url().default('https://api.abacatepay.com/v2'),
		ABACATEPAY_WEBHOOK_SECRET: z.string().optional(),
		/**
		 * Métodos oferecidos no checkout hospedado. O AbacatePay recusa o checkout
		 * inteiro quando um método não está habilitado na loja e não expõe quais
		 * estão, então a lista é configuração explícita, com PIX como padrão.
		 */
		ABACATEPAY_METHODS: z
			.string()
			.default('PIX')
			.transform((value, context) => {
				const methods = value
					.split(',')
					.map((method) => method.trim().toUpperCase())
					.filter(Boolean);
				const unsupported = methods.filter((method) => !checkoutMethods.includes(method as CheckoutMethod));
				if (methods.length === 0 || unsupported.length > 0) {
					context.addIssue({
						code: z.ZodIssueCode.custom,
						message: `ABACATEPAY_METHODS aceita apenas ${checkoutMethods.join(', ')}`,
					});
					return z.NEVER;
				}
				return [...new Set(methods)] as CheckoutMethod[];
			}),
		PAYMENTS_MODE: z.enum(['mock', 'abacatepay']).default('mock'),
		PAYMENT_RECONCILIATION_INTERVAL_SECONDS: z.coerce.number().int().min(30).default(60),
		PAYMENT_RECONCILIATION_MIN_AGE_MINUTES: z.coerce.number().int().min(1).default(20),
		PAYMENT_RECONCILIATION_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(25),
		OPENAI_API_KEY: z.string().optional(),
		GOOGLE_PLACES_API_KEY: z.string().optional(),
		SMTP_HOST: z.string().default('127.0.0.1'),
		SMTP_PORT: z.coerce.number().int().positive().default(55325),
		SMTP_SECURE: z
			.string()
			.default('false')
			.transform((value) => value === 'true'),
		SMTP_USER: z.string().optional(),
		SMTP_PASSWORD: z.string().optional(),
		EMAIL_FROM: z.string().default('Events Manager <hello@events.local>'),
		EMAIL_NOTIFICATIONS_ENABLED: z
			.enum(['true', 'false'])
			.default('false')
			.transform((value) => value === 'true'),
		NOTIFICATIONS_WORKER_TOKEN: z.preprocess(
			(value) => (value === '' ? undefined : value),
			z.string().min(32).optional(),
		),
	})
	.superRefine((env, context) => {
		if (env.NODE_ENV !== 'production') return;
		const requireSetting = (condition: boolean, field: string, message: string) => {
			if (!condition) context.addIssue({ code: 'custom', path: [field], message });
		};
		requireSetting(
			env.COOKIE_SECRET.length >= 32 && env.COOKIE_SECRET !== 'local-development-cookie-secret',
			'COOKIE_SECRET',
			'Use um segredo exclusivo com pelo menos 32 caracteres em produção.',
		);
		requireSetting(new URL(env.WEB_URL).protocol === 'https:', 'WEB_URL', 'HTTPS é obrigatório em produção.');
		requireSetting(
			env.APP_ENV === 'development' || env.PAYMENTS_MODE !== 'mock',
			'PAYMENTS_MODE',
			'Pagamentos simulados não são permitidos em produção.',
		);
		if (env.PAYMENTS_MODE === 'mock' && env.APP_ENV === 'development') return;
		requireSetting(
			!env.ABACATEPAY_METHODS.includes('CARD') || Boolean(env.ABACATEPAY_PUBLIC_KEY),
			'ABACATEPAY_PUBLIC_KEY',
			'Configure a chave pública do checkout transparente para aceitar cartão.',
		);
		requireSetting(
			env.APP_ENV !== 'production' || !env.ABACATEPAY_API_KEY?.startsWith('abc_dev_'),
			'ABACATEPAY_API_KEY',
			'Uma chave de teste não pode receber pagamentos de produção.',
		);
		requireSetting(
			Boolean(env.ABACATEPAY_API_KEY?.trim()),
			'ABACATEPAY_API_KEY',
			'Configure a chave do provedor em produção.',
		);
		requireSetting(
			Boolean(env.ABACATEPAY_WEBHOOK_SECRET?.trim()),
			'ABACATEPAY_WEBHOOK_SECRET',
			'Configure o segredo do webhook em produção.',
		);
	});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
	const parsed = envSchema.safeParse(source);

	if (!parsed.success) {
		const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
		throw new Error(`Configuração inválida da API: ${details}`);
	}

	return parsed.data;
}
