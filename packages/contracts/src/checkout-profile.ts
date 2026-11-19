import { z } from 'zod';
import { birthDateSchema, cpfSchema, phoneVerificationRequestSchema } from './schemas.js';

export const checkoutProfileFieldsSchema = z.object({
	first_name: z.string().trim().min(1, 'Informe seu nome.'),
	last_name: z.string().trim().min(1, 'Informe seu sobrenome.'),
	birth_date: birthDateSchema,
	email: z.string().trim().email('Informe um e-mail válido.'),
	document: cpfSchema,
	phone: phoneVerificationRequestSchema.shape.phone,
});
export type CheckoutProfileField = keyof z.infer<typeof checkoutProfileFieldsSchema> | 'phone_verified_at';
export function getCheckoutProfileMissingFields(profile: unknown): CheckoutProfileField[] {
	const value = profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : {};
	const result = checkoutProfileFieldsSchema.safeParse(value);
	const missing = result.success
		? []
		: [...new Set(result.error.issues.map((issue) => issue.path[0] as CheckoutProfileField))];
	if (typeof value.phone_verified_at !== 'string' || !Number.isFinite(Date.parse(value.phone_verified_at)))
		missing.push('phone_verified_at');
	return missing;
}
