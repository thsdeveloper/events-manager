'use client';

import type { Globals, Navigation, NavigationItem, Page, Post } from '@events-manager/contracts';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { forwardRef } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Container from '@/components/ui/container';
import { getMediaAssetUrl } from '@/lib/media';

interface FooterProps {
	globals: Globals;
	navigation: Navigation;
}

const socialIconMap: Record<string, string> = {
	discord: '/icons/social/discord.svg',
	facebook: '/icons/social/facebook.svg',
	github: '/icons/social/github.svg',
	instagram: '/icons/social/instagram.svg',
	linkedin: '/icons/social/linkedin.svg',
	x: '/icons/social/x.svg',
	youtube: '/icons/social/youtube.svg',
};

function navigationHref(item: NavigationItem) {
	if (typeof item.page === 'object' && item.page?.permalink) return (item.page as Page).permalink;
	if (typeof item.post === 'object' && item.post?.slug) return `/blog/${(item.post as Post).slug}`;
	if (item.url && /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(item.url)) return item.url;

	return null;
}

/**
 * Every surface here is painted with design-system tokens rather than fixed
 * slate values, so the footer follows the Sistema/Claro/Escuro preference like
 * the rest of the app instead of staying dark in the light theme.
 */
const Footer = forwardRef<HTMLElement, FooterProps>(({ globals, navigation }, ref) => {
	const title = globals.title || 'Events Manager';
	const lightLogoUrl = globals.logo ? getMediaAssetUrl(globals.logo) : '/images/logo.svg';
	const darkLogoUrl = globals.logo_dark_mode ? getMediaAssetUrl(globals.logo_dark_mode) : null;
	const socialLinks = (globals.social_links ?? []).filter((social) => /^https?:\/\//i.test(social.url));
	const navigationItems = (navigation.items ?? []).filter(
		(item): item is NavigationItem => typeof item !== 'string' && Boolean(navigationHref(item)),
	);

	return (
		<footer className="border-t border-border bg-muted/40 text-foreground" ref={ref}>
			<Container className="py-12 sm:py-16">
				<div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
					<div className="max-w-xl space-y-5">
						<Link className="inline-flex rounded-lg" href="/">
							<Image
								alt={`${title} — início`}
								className={darkLogoUrl ? 'h-auto w-36 dark:hidden' : 'h-auto w-36'}
								height={64}
								src={lightLogoUrl}
								width={160}
							/>
							{darkLogoUrl ? (
								<Image
									alt={`${title} — início`}
									className="hidden h-auto w-36 dark:block"
									height={64}
									src={darkLogoUrl}
									width={160}
								/>
							) : null}
						</Link>
						{globals.tagline ? (
							<p className="font-heading text-lg font-semibold text-foreground">{globals.tagline}</p>
						) : null}
						{globals.description ? (
							<p className="text-sm leading-6 text-muted-foreground">{globals.description}</p>
						) : null}
						{socialLinks.length ? (
							<div aria-label="Redes sociais" className="flex flex-wrap gap-2">
								{socialLinks.map((social) => (
									<a
										aria-label={`Abrir ${social.service}`}
										className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
										href={social.url}
										key={`${social.service}:${social.url}`}
										rel="noreferrer"
										target="_blank"
									>
										{socialIconMap[social.service] ? (
											<Image
												alt=""
												aria-hidden="true"
												/* The brand marks ship as solid black paths, so they only need
												   inverting once the surface behind them turns dark. */
												className="size-4 opacity-80 dark:invert"
												height={18}
												src={socialIconMap[social.service]}
												width={18}
											/>
										) : (
											<span className="text-xs uppercase">{social.service.slice(0, 2)}</span>
										)}
									</a>
								))}
							</div>
						) : null}
					</div>

					<div>
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Navegação</h2>
						{navigationItems.length ? (
							<ul className="mt-4 space-y-3 text-sm">
								{navigationItems.map((item) => {
									const href = navigationHref(item)!;
									const external = !href.startsWith('/');

									return (
										<li key={item.id}>
											{external ? (
												<a
													className="text-muted-foreground transition-colors hover:text-foreground"
													href={href}
													rel={href.startsWith('http') ? 'noreferrer' : undefined}
													target={href.startsWith('http') ? '_blank' : undefined}
												>
													{item.title}
												</a>
											) : (
												<Link
													className="text-muted-foreground transition-colors hover:text-foreground"
													href={href}
												>
													{item.title}
												</Link>
											)}
										</li>
									);
								})}
							</ul>
						) : (
							<p className="mt-4 text-sm leading-6 text-muted-foreground">
								Os links institucionais aparecerão aqui quando forem publicados.
							</p>
						)}
					</div>

					<div>
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sua conta</h2>
						<div className="mt-4 space-y-3 text-sm">
							<Link
								className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
								href="/perfil?section=ingressos"
							>
								Meus ingressos
							</Link>
							<Link
								className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
								href="/perfil"
							>
								Meu perfil
							</Link>
							<Link
								className="inline-flex items-center gap-2 font-semibold text-primary transition-colors hover:text-primary/80"
								href="/perfil/organizador/novo"
							>
								Quero organizar eventos
								<ArrowUpRight aria-hidden="true" className="size-4" />
							</Link>
						</div>
					</div>
				</div>

				<div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
					<p>
						© {new Date().getFullYear()} {title}. Todos os direitos reservados.
					</p>
					<ThemeToggle />
				</div>
			</Container>
		</footer>
	);
});

Footer.displayName = 'Footer';

export default Footer;
