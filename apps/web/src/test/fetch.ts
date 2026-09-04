import { vi } from 'vitest';

type FetchInput = Parameters<typeof fetch>[0];

interface JsonResponseInit {
	status?: number;
	headers?: Record<string, string>;
}

/**
 * Monta uma `Response` JSON. Para erros da API use `problemResponse`, que
 * segue o formato RFC 7807 devolvido pelo Fastify.
 */
export function jsonResponse(body: unknown, { status = 200, headers = {} }: JsonResponseInit = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...headers },
	});
}

export function problemResponse(status: number, title: string, detail?: string, context?: Record<string, unknown>) {
	return new Response(
		JSON.stringify({ type: `https://api.errors/${title.toLowerCase()}`, title, status, detail, context }),
		{ status, headers: { 'Content-Type': 'application/problem+json' } },
	);
}

/**
 * Substitui o `fetch` global por um mock que escolhe a resposta pela URL.
 * A primeira entrada cujo padrão bate (string contida ou RegExp) é usada; uma
 * URL sem correspondência falha o teste em vez de responder silenciosamente.
 *
 * @example
 * const fetchMock = mockFetch([
 *   ['/api/admin/event-configurations', () => jsonResponse({ platform_fee_percentage: 7 })],
 * ]);
 * expect(fetchMock).toHaveBeenCalledOnce();
 */
export function mockFetch(routes: Array<[string | RegExp, (input: FetchInput, init?: RequestInit) => Response]>) {
	const fetchMock = vi.fn(async (input: FetchInput, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const match = routes.find(([pattern]) => (pattern instanceof RegExp ? pattern.test(url) : url.includes(pattern)));
		if (!match) throw new Error(`Nenhuma resposta configurada para ${url}`);

		return match[1](input, init);
	});
	vi.stubGlobal('fetch', fetchMock);

	return fetchMock;
}
