import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
config({ path: resolve(process.cwd(), '../../.env') });
config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().default('0.0.0.0'),
    API_PORT: z.coerce.number().int().positive().default(3333),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    WEB_URL: z.string().url().default('http://localhost:3003'),
    SUPABASE_URL: z.string().url().default('http://127.0.0.1:55321'),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    COOKIE_SECRET: z.string().min(16).default('local-development-cookie-secret'),
    ABACATEPAY_API_KEY: z.string().optional(),
    ABACATEPAY_BASE_URL: z.string().url().default('https://api.abacatepay.com/v2'),
    ABACATEPAY_WEBHOOK_SECRET: z.string().optional(),
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
        .transform((value) => value === 'true')
        .default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().default('Events Manager <hello@events.local>'),
});
export function loadEnv(source = process.env) {
    const parsed = envSchema.safeParse(source);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        throw new Error(`Configuração inválida da API: ${details}`);
    }
    return parsed.data;
}
//# sourceMappingURL=env.js.map