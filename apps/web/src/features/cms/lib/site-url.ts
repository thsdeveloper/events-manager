import 'server-only';
import { fetchCmsSiteSettings } from '../api/server';

/** URL pública do site para links "Ver no site" e preview de SEO. */
export async function resolvePublicSiteUrl() {
	const fallback = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';
	try {
		const settings = await fetchCmsSiteSettings();

		return (settings.url ?? fallback).replace(/\/$/, '');
	} catch {
		return fallback.replace(/\/$/, '');
	}
}
