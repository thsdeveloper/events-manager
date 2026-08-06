import 'server-only';

import { cookies } from 'next/headers';

const internalApiUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333';

export class BackendRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string,
	) {
		super(message);
		this.name = 'BackendRequestError';
	}
}

export async function authenticatedBackendFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const cookieStore = await cookies();
	const response = await fetch(`${internalApiUrl}${path}`, {
		...init,
		headers: {
			...init.headers,
			cookie: cookieStore.toString(),
		},
		cache: 'no-store',
	});

	if (!response.ok) {
		const problem = await response.json().catch(() => null);
		throw new BackendRequestError(
			problem?.detail ?? `API request failed (${response.status})`,
			response.status,
			problem?.title,
		);
	}

	if (response.status === 204) return undefined as T;

	return response.json() as Promise<T>;
}
