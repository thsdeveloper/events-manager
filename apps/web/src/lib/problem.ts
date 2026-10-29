/**
 * Lê a mensagem de um problema RFC 7807 devolvido pela API.
 *
 * Um 422 de validação traz o campo recusado em `context.errors` (o `flatten()`
 * do Zod); essa mensagem ("CPF inválido") diz à pessoa o que corrigir, enquanto
 * o `detail` genérico ("Os dados enviados são inválidos.") não diz nada.
 */
export function describeProblem(problem: unknown, fallback = 'Não foi possível concluir a operação.'): string {
	if (!problem || typeof problem !== 'object') return fallback;
	const { detail, context } = problem as { detail?: unknown; context?: { errors?: unknown } };
	const errors = context?.errors as { fieldErrors?: Record<string, unknown>; formErrors?: unknown } | undefined;

	const fieldMessages = Object.values(errors?.fieldErrors ?? {}).flatMap((messages) =>
		Array.isArray(messages) ? messages.filter((message): message is string => typeof message === 'string') : [],
	);
	if (fieldMessages[0]) return fieldMessages[0];

	const formMessages = Array.isArray(errors?.formErrors) ? errors.formErrors : [];
	if (typeof formMessages[0] === 'string') return formMessages[0];

	return typeof detail === 'string' && detail.length > 0 ? detail : fallback;
}
