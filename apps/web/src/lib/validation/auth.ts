import { newPasswordSchema } from '@events-manager/contracts';
import { z } from 'zod';

/**
 * Client-side half of the auth forms. The password policy itself is not
 * restated here: `newPasswordSchema` comes straight from `packages/contracts`,
 * the same schema the API validates against, so the form can never refuse a
 * password the server would accept — or accept one it would refuse.
 *
 * Only the shapes the API has no opinion about live here: the confirmation
 * field and the pt-BR messages for empty inputs.
 */
const emailSchema = z
	.string()
	.trim()
	.min(1, 'Informe seu e-mail.')
	.email('Digite um e-mail válido.');

/** Login only checks that something was typed — the API decides if it matches. */
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Informe sua senha.'),
});

export const registerSchema = z
	.object({
		firstName: z.string().trim().min(1, 'Informe seu nome.').max(100, 'Máximo de 100 caracteres.'),
		lastName: z.string().trim().min(1, 'Informe seu sobrenome.').max(100, 'Máximo de 100 caracteres.'),
		email: emailSchema,
		password: newPasswordSchema,
		confirmPassword: z.string().min(1, 'Confirme sua senha.'),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: 'As senhas não coincidem.',
		path: ['confirmPassword'],
	});

export const forgotPasswordSchema = z.object({
	email: emailSchema,
});

export const resetPasswordSchema = z
	.object({
		password: newPasswordSchema,
		confirmPassword: z.string().min(1, 'Confirme sua senha.'),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: 'As senhas não coincidem.',
		path: ['confirmPassword'],
	});

/**
 * Mirrors `changePasswordSchema` in `apps/api/src/routes/auth.ts`, including the
 * "must differ from the current one" rule the API answers with
 * PASSWORD_UNCHANGED. `currentPassword` has no minimum: it is checked against
 * the stored password, and a rule here would lock out accounts created before
 * the current policy.
 */
export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Informe sua senha atual.'),
		password: newPasswordSchema,
		confirmPassword: z.string().min(1, 'Confirme sua senha.'),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: 'As senhas não coincidem.',
		path: ['confirmPassword'],
	})
	.refine((values) => !values.password || values.password !== values.currentPassword, {
		message: 'A nova senha precisa ser diferente da atual.',
		path: ['password'],
	});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
