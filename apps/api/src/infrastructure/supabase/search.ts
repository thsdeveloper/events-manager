export function sanitizePostgrestOrTerm(value: string) {
	return value
		.normalize('NFKC')
		.replace(/[^\p{L}\p{N}@.+\-\s]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 120);
}

export function isUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
