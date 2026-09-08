import { describe, expect, it } from 'vitest';
import { resolveRedirect } from './redirects';

const redirects = [
	{ url_from: '/antigo', url_to: '/novo', response_code: '301' as const },
	{ url_from: '/temporario', url_to: 'https://externo.example/destino', response_code: '302' as const },
	{ url_from: '/perigoso', url_to: 'javascript:alert(1)', response_code: '301' as const },
	{ url_from: '/protocolo', url_to: '//evil.example', response_code: '301' as const },
	{ url_from: null, url_to: '/x', response_code: '301' as const },
];

describe('resolveRedirect', () => {
	it('finds the CMS redirect for the requested permalink and says whether it is permanent', () => {
		expect(resolveRedirect(redirects, '/antigo')).toEqual({ destination: '/novo', permanent: true });
		expect(resolveRedirect(redirects, '/temporario')).toEqual({
			destination: 'https://externo.example/destino',
			permanent: false,
		});
	});

	it('returns null when no redirect matches', () => {
		expect(resolveRedirect(redirects, '/sem-redirect')).toBeNull();
		expect(resolveRedirect([], '/antigo')).toBeNull();
	});

	it('ignores a trailing slash difference between the request and the configured source', () => {
		expect(resolveRedirect(redirects, '/antigo/')).toEqual({ destination: '/novo', permanent: true });
		expect(resolveRedirect([{ url_from: '/antigo/', url_to: '/novo', response_code: '301' }], '/antigo')).toEqual({
			destination: '/novo',
			permanent: true,
		});
	});

	it('only follows internal paths or http(s) URLs, never other schemes or protocol-relative URLs', () => {
		expect(resolveRedirect(redirects, '/perigoso')).toBeNull();
		expect(resolveRedirect(redirects, '/protocolo')).toBeNull();
	});
});
