import { ReactNode } from 'react';
import { fetchSiteData } from '@/lib/content/fetchers';

export default async function AuthLayout({ children }: { children: ReactNode }) {
	const { globals } = await fetchSiteData();

	return (
		<main className="min-h-screen w-full" data-globals={JSON.stringify(globals)} id="main-content" tabIndex={-1}>
			{children}
		</main>
	);
}
