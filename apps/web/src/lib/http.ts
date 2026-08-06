/**
 * @fileoverview Cliente HTTP SSR-safe com suporte a Problem Details (RFC 7807)
 *
 * Fornece função apiFetch que:
 * - Funciona em SSR (Server-Side Rendering) e CSR (Client-Side Rendering)
 * - Parseia respostas Problem Details automaticamente
 * - Lança HttpError com informações estruturadas
 * - Propaga x-request-id para rastreamento
 */

import type { ProblemDetails } from './errors';

/**
 * Classe de erro HTTP com suporte a Problem Details
 */
export class HttpError extends Error {
	public readonly status: number;
	public readonly code: string;
	public readonly type: string;
	public readonly requestId?: string;
	public readonly context?: Record<string, unknown>;
	public readonly url: string;

	constructor(
		message: string,
		options: {
			status: number;
			code?: string;
			type?: string;
			requestId?: string;
			context?: Record<string, unknown>;
			url: string;
		},
	) {
		super(message);
		this.name = 'HttpError';
		this.status = options.status;
		this.code = options.code || 'HTTP_ERROR';
		this.type = options.type || `https://api.errors/http_${options.status}`;
		this.requestId = options.requestId;
		this.context = options.context;
		this.url = options.url;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, HttpError);
		}
	}

	/**
	 * Verifica se é erro de autenticação (401)
	 */
	isUnauthorized(): boolean {
		return this.status === 401;
	}

	/**
	 * Verifica se é erro de acesso negado (403)
	 */
	isForbidden(): boolean {
		return this.status === 403;
	}

	/**
	 * Verifica se é erro de não encontrado (404)
	 */
	isNotFound(): boolean {
		return this.status === 404;
	}

	/**
	 * Verifica se é erro de validação (422)
	 */
	isValidationError(): boolean {
		return this.status === 422;
	}

	/**
	 * Verifica se é erro de rate limit (429)
	 */
	isRateLimitError(): boolean {
		return this.status === 429;
	}

	/**
	 * Verifica se é erro de servidor (5xx)
	 */
	isServerError(): boolean {
		return this.status >= 500;
	}
}

/**
 * Opções para apiFetch
 */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
	/**
	 * Corpo da requisição (será convertido para JSON automaticamente)
	 */
	body?: unknown;

	/**
	 * Query params (serão adicionados à URL)
	 */
	query?: Record<string, string | number | boolean | null | undefined>;

	/**
	 * Timeout em milissegundos
	 * @default 30000 (30 segundos)
	 */
	timeout?: number;

	/**
	 * Se deve parsear a resposta como JSON
	 * @default true
	 */
	parseJson?: boolean;

	/**
	 * Headers customizados
	 */
	headers?: HeadersInit;

	/**
	 * Request ID para rastreamento (será gerado se não fornecido)
	 */
	requestId?: string;
}

/**
 * Cliente HTTP SSR-safe com suporte a Problem Details
 *
 * @example
 * ```ts
 * // GET simples
 * const users = await apiFetch<User[]>('/api/users')
 *
 * // POST com body
 * const user = await apiFetch<User>('/api/users', {
 *   method: 'POST',
 *   body: { name: 'João', email: 'joao@example.com' }
 * })
 *
 * // Com query params
 * const users = await apiFetch<User[]>('/api/users', {
 *   query: { page: 1, limit: 10 }
 * })
 *
 * // Tratamento de erro
 * try {
 *   await apiFetch('/api/users/123')
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.log(error.status, error.code, error.requestId)
 *   }
 * }
 * ```
 */
export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> {
	const {
		body,
		query,
		timeout = 30000,
		parseJson = true,
		headers: customHeaders = {},
		requestId,
		...fetchOptions
	} = options;

	// Constrói URL com query params
	let finalUrl = url;
	if (query) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString();
		if (queryString) {
			finalUrl += (url.includes('?') ? '&' : '?') + queryString;
		}
	}

	// Garante que URL seja absoluta em SSR
	const absoluteUrl = getAbsoluteUrl(finalUrl);

	// Prepara headers
	const headers = new Headers(customHeaders);

	// Adiciona Content-Type se houver body (exceto FormData)
	if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}

	// Adiciona requestId para rastreamento
	if (requestId) {
		headers.set('x-request-id', requestId);
	}

	// Prepara body (não serializa FormData)
	const finalBody = body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined;

	// Cria AbortController para timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		// Faz requisição
		const response = await fetch(absoluteUrl, {
			...fetchOptions,
			headers,
			body: finalBody,
			signal: controller.signal,
			credentials: 'include', // Envia cookies de autenticação automaticamente
		});

		clearTimeout(timeoutId);

		// Extrai requestId da resposta
		const responseRequestId = response.headers.get('x-request-id') || requestId;

		// Erro HTTP
		if (!response.ok) {
			await handleErrorResponse(response, absoluteUrl, responseRequestId);
		}

		// Resposta sem conteúdo (204 No Content, etc)
		if (response.status === 204 || response.headers.get('Content-Length') === '0') {
			return undefined as T;
		}

		// Parseia resposta
		if (parseJson) {
			return (await response.json()) as T;
		}

		return (await response.text()) as T;
	} catch (error) {
		clearTimeout(timeoutId);

		// Timeout
		if (error instanceof Error && error.name === 'AbortError') {
			throw new HttpError('Requisição expirou', {
				status: 504,
				code: 'TIMEOUT',
				url: absoluteUrl,
				requestId,
			});
		}

		// HttpError já tratado
		if (error instanceof HttpError) {
			throw error;
		}

		// Erro de rede
		throw new HttpError(error instanceof Error ? error.message : 'Erro de rede desconhecido', {
			status: 0,
			code: 'NETWORK_ERROR',
			url: absoluteUrl,
			requestId,
		});
	}
}

/**
 * Trata resposta de erro e lança HttpError
 */
async function handleErrorResponse(response: Response, url: string, requestId?: string): Promise<never> {
	const contentType = response.headers.get('Content-Type') || '';

	// Tenta parsear Problem Details
	if (contentType.includes('application/problem+json') || contentType.includes('application/json')) {
		try {
			const problem = (await response.json()) as ProblemDetails;

			throw new HttpError(problem.detail || problem.title || 'Erro desconhecido', {
				status: response.status,
				code: extractCodeFromType(problem.type),
				type: problem.type,
				requestId: problem.requestId || requestId,
				context: problem.context,
				url,
			});
		} catch (error) {
			// Se falhar ao parsear, continua para erro genérico
			if (error instanceof HttpError) {
				throw error;
			}
		}
	}

	// Erro genérico baseado no status
	const message = getDefaultErrorMessage(response.status);

	throw new HttpError(message, {
		status: response.status,
		url,
		requestId,
	});
}

/**
 * Extrai código do campo type do Problem Details
 *
 * @example
 * "https://api.errors/validation_error" -> "VALIDATION_ERROR"
 */
function extractCodeFromType(type: string): string {
	const parts = type.split('/');
	const lastPart = parts[parts.length - 1];

	return lastPart.toUpperCase();
}

/**
 * Retorna mensagem padrão baseada no status HTTP
 */
function getDefaultErrorMessage(status: number): string {
	const messages: Record<number, string> = {
		400: 'Requisição inválida',
		401: 'Você precisa estar autenticado',
		403: 'Você não tem permissão para acessar este recurso',
		404: 'Recurso não encontrado',
		409: 'Conflito com o estado atual do recurso',
		422: 'Os dados enviados são inválidos',
		429: 'Muitas requisições. Tente novamente mais tarde',
		500: 'Erro interno do servidor',
		502: 'Gateway inválido',
		503: 'Serviço temporariamente indisponível',
		504: 'Timeout do gateway',
	};

	return messages[status] || `Erro HTTP ${status}`;
}

/**
 * Converte URL relativa para absoluta em SSR
 */
function getAbsoluteUrl(url: string): string {
	// Já é absoluta
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url;
	}

	// Cliente (browser)
	if (typeof window !== 'undefined') {
		return url;
	}

	// Servidor (SSR)
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003';

	return new URL(url, baseUrl).toString();
}

/**
 * Helpers para métodos HTTP comuns
 */
export const http = {
	get: <T = unknown>(url: string, options?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
		apiFetch<T>(url, { ...options, method: 'GET' }),

	post: <T = unknown>(url: string, body?: unknown, options?: Omit<ApiFetchOptions, 'method'>) =>
		apiFetch<T>(url, { ...options, method: 'POST', body }),

	put: <T = unknown>(url: string, body?: unknown, options?: Omit<ApiFetchOptions, 'method'>) =>
		apiFetch<T>(url, { ...options, method: 'PUT', body }),

	patch: <T = unknown>(url: string, body?: unknown, options?: Omit<ApiFetchOptions, 'method'>) =>
		apiFetch<T>(url, { ...options, method: 'PATCH', body }),

	delete: <T = unknown>(url: string, options?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
		apiFetch<T>(url, { ...options, method: 'DELETE' }),
};
