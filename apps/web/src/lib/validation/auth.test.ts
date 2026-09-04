import { describe, expect, it } from 'vitest';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth';

/** First message for a field, or undefined when the field passed. */
function errorFor(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }, field: string) {
	return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('loginSchema', () => {
	it('accepts any non-empty password so the API decides if it matches', () => {
		const result = loginSchema.safeParse({ email: 'user@example.com', password: 'abc' });
		expect(result.success).toBe(true);
	});

	it('rejects a malformed e-mail', () => {
		const result = loginSchema.safeParse({ email: 'user@', password: 'segredo123' });
		expect(errorFor(result, 'email')).toBe('Digite um e-mail válido.');
	});

	it('rejects empty fields with their own messages', () => {
		const result = loginSchema.safeParse({ email: '', password: '' });
		expect(errorFor(result, 'email')).toBe('Informe seu e-mail.');
		expect(errorFor(result, 'password')).toBe('Informe sua senha.');
	});

	it('trims the e-mail so a stray space does not fail the request', () => {
		const result = loginSchema.safeParse({ email: '  user@example.com  ', password: 'segredo123' });
		expect(result.success && result.data.email).toBe('user@example.com');
	});
});

function yearsAgo(years: number, offsetDays = 0) {
	const date = new Date();
	date.setUTCFullYear(date.getUTCFullYear() - years);
	date.setUTCDate(date.getUTCDate() + offsetDays);

	return date.toISOString().slice(0, 10);
}

describe('registerSchema', () => {
	const valid = {
		firstName: 'Ana',
		lastName: 'Souza',
		email: 'ana@example.com',
		password: 'Qsesbs2006#@!',
		confirmPassword: 'Qsesbs2006#@!',
		birthDate: yearsAgo(20),
	};

	it('requires a birth date and refuses anyone under 13', () => {
		expect(errorFor(registerSchema.safeParse({ ...valid, birthDate: '' }), 'birthDate')).toBe(
			'Informe sua data de nascimento.',
		);
		expect(errorFor(registerSchema.safeParse({ ...valid, birthDate: yearsAgo(13, 1) }), 'birthDate')).toBe(
			'É preciso ter pelo menos 13 anos para criar uma conta.',
		);
		expect(registerSchema.safeParse({ ...valid, birthDate: yearsAgo(13) }).success).toBe(true);
	});

	it('accepts a complete form', () => {
		expect(registerSchema.safeParse(valid).success).toBe(true);
	});

	it('enforces the password policy shared with the API', () => {
		const withPassword = (password: string) => registerSchema.safeParse({ ...valid, password, confirmPassword: password });

		expect(errorFor(withPassword('Ab1#'), 'password')).toBe('A senha deve ter pelo menos 8 caracteres.');
		expect(errorFor(withPassword('12345678#'), 'password')).toBe('A senha deve conter pelo menos uma letra.');
		expect(errorFor(withPassword('abcdefgh#'), 'password')).toBe('A senha deve conter pelo menos um número.');
		expect(errorFor(withPassword('abcdefg1'), 'password')).toBe('A senha deve conter pelo menos um caractere especial.');
		expect(errorFor(withPassword(`Aa1#${'x'.repeat(61)}`), 'password')).toBe(
			'A senha deve ter no máximo 64 caracteres.',
		);
		expect(withPassword('senha-forte-1').success).toBe(true);
	});

	it('reports a password mismatch on the confirmation field', () => {
		const result = registerSchema.safeParse({ ...valid, confirmPassword: 'outrasenha' });
		expect(errorFor(result, 'confirmPassword')).toBe('As senhas não coincidem.');
	});

	it('rejects a name made only of spaces', () => {
		const result = registerSchema.safeParse({ ...valid, firstName: '   ' });
		expect(errorFor(result, 'firstName')).toBe('Informe seu nome.');
	});
});

describe('forgotPasswordSchema', () => {
	it('requires a valid e-mail', () => {
		expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
		expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
	});
});

describe('resetPasswordSchema', () => {
	it('requires both fields to match and to satisfy the policy', () => {
		expect(
			resetPasswordSchema.safeParse({ password: 'Qsesbs2006#@!', confirmPassword: 'Qsesbs2006#@!' }).success,
		).toBe(true);

		const mismatch = resetPasswordSchema.safeParse({ password: 'Qsesbs2006#@!', confirmPassword: 'Qsesbs2006#@?' });
		expect(errorFor(mismatch, 'confirmPassword')).toBe('As senhas não coincidem.');

		const short = resetPasswordSchema.safeParse({ password: 'Ab1#', confirmPassword: 'Ab1#' });
		expect(errorFor(short, 'password')).toBe('A senha deve ter pelo menos 8 caracteres.');

		const noSymbol = resetPasswordSchema.safeParse({ password: 'segredo123', confirmPassword: 'segredo123' });
		expect(errorFor(noSymbol, 'password')).toBe('A senha deve conter pelo menos um caractere especial.');
	});
});

describe('loginSchema stays outside the policy', () => {
	it('accepts a password that predates the current rules', () => {
		// Enforcing the policy at login would lock out every account created
		// before it — including from the screen used to fix the password.
		expect(loginSchema.safeParse({ email: 'ana@example.com', password: 'segredo123' }).success).toBe(true);
	});
});
