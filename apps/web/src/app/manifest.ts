import type { MetadataRoute } from 'next';
import { fetchSiteData } from '@/lib/content/fetchers';
import { getBrandingManifest } from '@/lib/branding';

export const revalidate = 60;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
	const { globals } = await fetchSiteData();

	return getBrandingManifest(globals);
}
