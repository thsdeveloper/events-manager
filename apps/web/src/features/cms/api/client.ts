/**
 * Chamadas do navegador ao painel de conteúdo. Toda mutação do CMS passa por
 * aqui para que o cookie de sessão siga junto e os erros RFC 7807 cheguem aos
 * formulários já com as mensagens por campo.
 */

export const CMS_API_BASE = '/api/super-admin/cms';

export type FieldErrors = Record<string, string[]>;

export class CmsRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string,
		readonly fieldErrors: FieldErrors = {},
	) {
		super(message);
		this.name = 'CmsRequestError';
	}
}

interface CmsRequestInit {
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	body?: unknown;
	signal?: AbortSignal;
}

const GENERIC_FAILURE = 'Não foi possível concluir a operação. Tente novamente.';

function extractFieldErrors(context: unknown): FieldErrors {
	if (!context || typeof context !== 'object') return {};
	const errors = (context as { errors?: { fieldErrors?: unknown } }).errors;
	const fieldErrors = errors && typeof errors === 'object' ? errors.fieldErrors : undefined;
	if (!fieldErrors || typeof fieldErrors !== 'object') return {};

	return Object.fromEntries(
		Object.entries(fieldErrors as Record<string, unknown>).map(([field, messages]) => [
			field,
			Array.isArray(messages) ? messages.map(String) : [String(messages)],
		]),
	);
}

export async function cmsRequest<T = unknown>(path: string, init: CmsRequestInit = {}): Promise<T> {
	const method = init.method ?? 'GET';
	const hasBody = init.body !== undefined;
	const response = await fetch(`${CMS_API_BASE}${path}`, {
		method,
		credentials: 'include',
		headers: hasBody ? { 'Content-Type': 'application/json' } : {},
		body: hasBody ? JSON.stringify(init.body) : undefined,
		signal: init.signal,
	});

	if (!response.ok) {
		const problem = await response.json().catch(() => null);
		throw new CmsRequestError(
			typeof problem?.detail === 'string' && problem.detail ? problem.detail : GENERIC_FAILURE,
			response.status,
			typeof problem?.title === 'string' ? problem.title : 'HTTP_ERROR',
			extractFieldErrors(problem?.context),
		);
	}

	if (response.status === 204) return undefined as T;

	return (await response.json()) as T;
}

export function describeError(error: unknown, fallback = GENERIC_FAILURE) {
	return error instanceof Error && error.message ? error.message : fallback;
}
