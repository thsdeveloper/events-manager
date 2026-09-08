import type { MetadataRoute } from 'next';
import { fetchSiteData } from '@/lib/content/fetchers';
import { resolveSiteUrl } from '@/lib/seo/site-url';

/** Áreas autenticadas ou administrativas: sem valor para busca e sem sessão do robô. */
const PRIVATE_PATHS = ['/admin', '/super-admin', '/perfil', '/api/', '/login', '/my-registrations', '/examples'];

export default async function robots(): Promise<MetadataRoute.Robots> {
	const { globals } = await fetchSiteData();
	const siteUrl = resolveSiteUrl(globals);

	return {
		rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }],
		sitemap: `${siteUrl}/sitemap.xml`,
		host: siteUrl,
	};
}
