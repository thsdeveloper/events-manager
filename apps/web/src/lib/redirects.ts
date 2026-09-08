import { fetchRedirects } from './content/fetchers';
import type { Redirect as NextRedirect } from 'next/dist/lib/load-custom-routes';

export interface RedirectError {
	type: 'redirect';
	destination: string;
	status: string;
}

export function isRedirectError(error: unknown): error is RedirectError {
	return typeof error === 'object' && error !== null && 'type' in error && error.type === 'redirect';
}

export interface ResolvedRedirect {
	destination: string;
	permanent: boolean;
}

type RedirectLike = { url_from?: string | null; url_to?: string | null; response_code?: '301' | '302' | null };

function normalizePath(path: string) {
	return path.replace(/\/+$/, '') || '/';
}

function isSafeDestination(value: string) {
	return (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value);
}

/**
 * Decide, em tempo de execução, se um permalink sem página cadastrada tem um
 * redirecionamento no CMS. Só destinos internos (`/x`) ou http(s) são seguidos.
 */
export function resolveRedirect(redirects: RedirectLike[], permalink: string): ResolvedRedirect | null {
	const requested = normalizePath(permalink);
	const match = redirects.find(
		(redirect) => typeof redirect.url_from === 'string' && normalizePath(redirect.url_from) === requested,
	);
	const destination = match?.url_to?.trim();

	if (!destination || !isSafeDestination(destination)) return null;

	return { destination, permanent: match?.response_code !== '302' };
}

export async function generateRedirects(): Promise<NextRedirect[]> {
	try {
		const redirects = await fetchRedirects();

		return redirects
			.filter(
				(redirect): redirect is { url_from: string; url_to: string; response_code: '301' | '302' } =>
					typeof redirect.url_from === 'string' &&
					typeof redirect.url_to === 'string' &&
					(redirect.response_code === '301' || redirect.response_code === '302'),
			)
			.map((redirect) => ({
				source: redirect.url_from,
				destination: redirect.url_to,
				permanent: redirect.response_code === '301',
			}));
	} catch (error) {
		console.error('Error generating redirects:', error);

		return [];
	}
}
