export type PublicationPatch<T> = Omit<T, 'status' | 'published_at'> &
	Partial<Pick<T, Extract<keyof T, 'status' | 'published_at'>>>;
export function publicationPatch<T extends { status: string; published_at: string | null }>(
	parsed: T,
	raw: unknown,
): PublicationPatch<T> {
	const body = raw && typeof raw === 'object' ? raw : {};
	const { status, published_at, ...rest } = parsed;
	return {
		...rest,
		...(Object.hasOwn(body, 'status') ? { status } : {}),
		...(Object.hasOwn(body, 'published_at') ? { published_at } : {}),
	} as PublicationPatch<T>;
}
