const internalApiUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333';

/**
 * Carrega o status/código do problem+json devolvido pela API, para que quem
 * chama consiga separar "não existe" (fluxo normal, vira notFound) de uma
 * falha real de infraestrutura.
 */
export class BackendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof BackendError && error.status === 404;
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit & { revalidate?: number; tags?: string[] } = {},
): Promise<T> {
  const { revalidate = 30, tags, ...requestInit } = init;
  const response = await fetch(`${internalApiUrl}${path}`, {
    ...requestInit,
    next: { revalidate, tags },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new BackendError(
      problem?.detail ?? `API request failed (${response.status})`,
      response.status,
      problem?.title,
    );
  }

  return response.json() as Promise<T>;
}
