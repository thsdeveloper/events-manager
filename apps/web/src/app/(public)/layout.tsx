import { ReactNode } from 'react';
import SiteLayout from '@/components/layout/SiteLayout';
import { fetchSiteData } from '@/lib/content/fetchers';

export default async function PublicLayout({ children }: { children: ReactNode }) {
	const { globals, headerNavigation, footerNavigation } = await fetchSiteData();

	return (
		<SiteLayout
			headerNavigation={headerNavigation}
			footerNavigation={footerNavigation}
			globals={globals}
		>
			<main className="flex-grow">{children}</main>
		</SiteLayout>
	);
}
