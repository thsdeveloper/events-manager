import '@/styles/globals.css';
import localFont from 'next/font/local';
const dmSans = localFont({
	src: '../../public/fonts/dm-sans-latina.woff2',
	variable: '--font-dm-sans',
	display: 'swap',
	weight: '100 1000',
});
import '@/styles/fonts.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';

import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { ToastConfig } from '@/components/ToastConfig';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProgressProvider } from '@/contexts/ProgressProvider';
import { fetchSiteData } from '@/lib/content/fetchers';
import { getBrandingIcons, getBrandAccentColor } from '@/lib/branding';
import { resolveSiteUrl } from '@/lib/seo/site-url';

export async function generateMetadata(): Promise<Metadata> {
	const { globals } = await fetchSiteData();

	const siteTitle = globals?.title || 'Events Manager';
	const siteDescription = globals?.description || 'Plataforma de gestão de eventos.';

	return {
		// Base para URLs relativas em Open Graph, canonical e ícones.
		metadataBase: new URL(resolveSiteUrl(globals)),
		title: {
			default: siteTitle,
			template: `%s | ${siteTitle}`,
		},
		description: siteDescription,
		icons: getBrandingIcons(globals),
		manifest: '/manifest.webmanifest',
	};
}

export default async function RootLayout({ children }: { children: ReactNode }) {
	const { globals } = await fetchSiteData();
	const accentColor = getBrandAccentColor(globals?.accent_color);

	return (
		<html
			className={dmSans.variable}
			lang="pt-BR"
			style={{ '--accent-color': accentColor } as React.CSSProperties}
			suppressHydrationWarning
		>
			<body className="antialiased font-sans flex flex-col min-h-screen">
				<a className="skip-link" href="#main-content">
					Pular para o conteúdo principal
				</a>
				<AppProgressProvider>
					<ThemeProvider>
						<ReactQueryProvider>
							<AuthProvider>
								<ToastConfig />
								{children}
								<Toaster />
							</AuthProvider>
						</ReactQueryProvider>
					</ThemeProvider>
				</AppProgressProvider>
			</body>
		</html>
	);
}
