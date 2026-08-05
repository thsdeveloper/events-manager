const internalApiUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333';

export async function backendFetch<T>(path: string, init: RequestInit & { revalidate?: number } = {}): Promise<T> {
  const { revalidate = 30, ...requestInit } = init;
  const response = await fetch(`${internalApiUrl}${path}`, {
    ...requestInit,
    next: { revalidate },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
