import '@/styles/globals.css';
import '@/styles/fonts.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';

import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { ToastConfig } from '@/components/ToastConfig';
import { AuthProvider } from '@/contexts/AuthContext';
import { fetchSiteData } from '@/lib/content/fetchers';
import { getMediaAssetUrl } from '@/lib/media';

export async function generateMetadata(): Promise<Metadata> {
	const { globals } = await fetchSiteData();

	const siteTitle = globals?.title || 'Events Manager';
	const siteDescription = globals?.description || 'Plataforma de gestão de eventos.';
	const faviconURL = globals?.favicon ? getMediaAssetUrl(globals.favicon) : '/favicon.ico';

	return {
		title: {
			default: siteTitle,
			template: `%s | ${siteTitle}`,
		},
		description: siteDescription,
		icons: {
			icon: faviconURL,
		},
	};
}

export default async function RootLayout({ children }: { children: ReactNode }) {
	const { globals } = await fetchSiteData();
	const accentColor = globals?.accent_color || '#6644ff';

	return (
		<html lang="pt-BR" style={{ '--accent-color': accentColor } as React.CSSProperties} suppressHydrationWarning>
			<body className="antialiased font-sans flex flex-col min-h-screen">
				<a className="skip-link" href="#main-content">
					Pular para o conteúdo principal
				</a>
				<ThemeProvider>
					<AuthProvider>
						<ToastConfig />
						{children}
						<Toaster />
					</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
