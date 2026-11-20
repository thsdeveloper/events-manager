export function safeDestination(value: unknown): string | null {
	return typeof value === 'string' &&
		/^\/(?:eventos\/[a-z0-9-]+\/checkout|perfil(?:\?section=[a-z-]+|\/ingressos\/[a-f0-9-]{36})?)$/.test(value)
		? value
		: null;
}
export function browserNavigation(url: string, webUrl: string): 'internal' | 'external' | 'blocked' {
	try {
		const target = new URL(url);
		const origin = new URL(webUrl);
		if (target.origin === origin.origin && ['http:', 'https:'].includes(target.protocol)) return 'internal';
		return target.protocol === 'https:' ? 'external' : 'blocked';
	} catch {
		return 'blocked';
	}
}
