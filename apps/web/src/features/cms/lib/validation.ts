import type { SafeParseReturnType, ZodTypeAny, z } from 'zod';
import type { FieldErrors } from '../api/client';

/** Converte os issues do Zod em `{ 'buttons.1.label': ['mensagem'] }`. */
export function fieldErrorsFromZod(result: SafeParseReturnType<unknown, unknown>): FieldErrors {
	if (result.success) return {};
	const errors: FieldErrors = {};
	for (const issue of result.error.issues) {
		const key = issue.path.length ? issue.path.join('.') : '_form';
		errors[key] = [...(errors[key] ?? []), issue.message];
	}

	return errors;
}

export function validateWith<Schema extends ZodTypeAny>(
	schema: Schema,
	input: unknown,
): { data: z.output<Schema>; errors: null } | { data: null; errors: FieldErrors } {
	const result = schema.safeParse(input);
	if (result.success) return { data: result.data, errors: null };

	return { data: null, errors: fieldErrorsFromZod(result) };
}

export function firstError(errors: FieldErrors | null | undefined, field: string) {
	return errors?.[field]?.[0];
}

/** Junta as mensagens de todos os campos com um prefixo (ex.: `buttons.0`). */
export function errorsUnder(errors: FieldErrors | null | undefined, prefix: string) {
	if (!errors) return [];

	return Object.entries(errors)
		.filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
		.flatMap(([, messages]) => messages);
}
