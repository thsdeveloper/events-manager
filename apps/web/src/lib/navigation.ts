export function safeInternalRedirect(value: string | null | undefined, fallback: string) {
	if (!value?.startsWith('/')) return fallback;
	try {
		const decoded = decodeURIComponent(value);
		if (
			decoded.startsWith('//') ||
			[...decoded].some(
				(character) => character === '\\' || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
			)
		)
			return fallback;
		const origin = 'https://internal.invalid';

		return new URL(value, origin).origin === origin ? value : fallback;
	} catch {
		return fallback;
	}
}
