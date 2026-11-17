import type { CSSProperties } from 'react';
import type { Event, EventPageLayout, EventPageSection } from '@events-manager/contracts';
import { Globe, Mail } from 'lucide-react';
import Link from 'next/link';
import MediaImage from '@/components/shared/MediaImage';
import { localizedLayout, type EventDescriptionLanguage } from '../content';
import { EventLanguageLinks } from './EventLanguageLinks';
import { EventPreviewSurface } from './EventPreviewSurface';
import { cn } from '@/lib/utils';
import { organizerOf, type LandingContext, type LandingMode } from './landing-context';
import { AccentButton, AnchorLink } from './LandingPrimitives';
import {
	AboutSection,
	CountdownSection,
	CtaSection,
	FaqSection,
	GallerySection,
	HeroSection,
	LocationSection,
	RichtextSection,
	ScheduleSection,
	SpeakersSection,
	SponsorsSection,
	TicketsSection,
} from './LandingSections';

export interface EventLandingPageProps {
	event: Event;
	layout: EventPageLayout;
	/** `preview` desliga a navegação: o construtor mostra a página sem sair dela. */
	mode?: LandingMode;
	language?: EventDescriptionLanguage;
	previewCoverUrl?: string | null;
}

const DEFAULT_ACCENT = '#6644ff';

/**
 * Landing page do evento, montada pelo organizador. Sem cabeçalho nem rodapé
 * do site: a página é dele, com a própria navegação por âncoras. A ordem e a
 * visibilidade das seções vêm do layout; o conteúdo dinâmico (ingressos,
 * datas, local, organizador) vem do evento.
 */
export function EventLandingPage({
	event,
	layout: originalLayout,
	mode = 'live',
	language = 'pt',
	previewCoverUrl,
}: EventLandingPageProps) {
	const layout = localizedLayout(originalLayout, event, language);
	const visible = layout.sections.filter((section) => !section.hidden);
	const context: LandingContext = {
		event,
		mode,
		previewCoverUrl,
		checkoutHref: `/eventos/${event.slug}/checkout`,
		ticketsAnchor: visible.find((section) => section.type === 'tickets')?.anchor ?? null,
	};
	const dark = layout.theme.mode === 'dark';
	const style = { '--landing-accent': layout.theme.accent ?? DEFAULT_ACCENT } as CSSProperties;

	const page = (
		<div
			data-theme={layout.theme.mode}
			style={style}
			className={cn(
				'min-h-screen font-sans',
				dark ? 'dark bg-slate-950 text-white [&_.landing-prose]:prose-invert' : 'bg-white text-slate-900',
			)}
		>
			{layout.header.show ? <LandingHeader context={context} layout={layout} /> : null}
			<main lang={language}>
				{mode === 'live' && (
					<div className="mx-auto max-w-6xl px-4">
						<EventLanguageLinks event={event} language={language} />
					</div>
				)}
				{visible.map((section) => (
					<LandingSection key={section.id} context={context} section={section} />
				))}
			</main>
			<LandingFooter context={context} layout={layout} />
		</div>
	);

	return mode === 'preview' ? <EventPreviewSurface>{page}</EventPreviewSurface> : page;
}

function LandingSection({ context, section }: { context: LandingContext; section: EventPageSection }) {
	switch (section.type) {
		case 'hero':
			return <HeroSection context={context} section={section} />;
		case 'about':
			return <AboutSection context={context} section={section} />;
		case 'tickets':
			return <TicketsSection context={context} section={section} />;
		case 'schedule':
			return <ScheduleSection context={context} section={section} />;
		case 'speakers':
			return <SpeakersSection context={context} section={section} />;
		case 'location':
			return <LocationSection context={context} section={section} />;
		case 'faq':
			return <FaqSection context={context} section={section} />;
		case 'gallery':
			return <GallerySection context={context} section={section} />;
		case 'sponsors':
			return <SponsorsSection context={context} section={section} />;
		case 'cta':
			return <CtaSection context={context} section={section} />;
		case 'countdown':
			return <CountdownSection context={context} section={section} />;
		case 'richtext':
			return <RichtextSection context={context} section={section} />;
	}
}

function LandingHeader({ context, layout }: { context: LandingContext; layout: EventPageLayout }) {
	const { header } = layout;
	const organizer = organizerOf(context.event);
	const logo = header.logo ?? (header.useOrganizerLogo ? (organizer?.logo ?? null) : null);
	const title = header.title?.trim() || context.event.title;

	return (
		<header
			className={cn(
				'z-40 w-full border-b border-current/10 backdrop-blur',
				header.sticky && 'sticky top-0',
				layout.theme.mode === 'dark' ? 'bg-slate-950/85' : 'bg-white/85',
			)}
		>
			<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex min-w-0 items-center gap-3">
					{logo ? (
						<span className="relative block h-9 w-28">
							<MediaImage uuid={logo as string} alt={title} fill className="object-contain object-left" />
						</span>
					) : (
						<span className="truncate text-base font-bold">{title}</span>
					)}
				</div>
				{header.nav.length > 0 ? (
					<nav aria-label="Seções da página" className="hidden items-center gap-6 md:flex">
						{header.nav.map((item) => (
							<AnchorLink
								key={`${item.anchor}-${item.label}`}
								anchor={item.anchor}
								mode={context.mode}
								className="text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
							>
								{item.label}
							</AnchorLink>
						))}
					</nav>
				) : null}
				<AccentButton context={context} className="px-4 py-2 text-sm">
					{header.ctaLabel}
				</AccentButton>
			</div>
		</header>
	);
}

function LandingFooter({ context, layout }: { context: LandingContext; layout: EventPageLayout }) {
	const organizer = organizerOf(context.event);

	return (
		<footer className="border-t border-current/10 py-10">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
				{layout.footer.showOrganizer && organizer ? (
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wide opacity-60">Realização</p>
						<div className="flex items-center gap-3">
							{organizer.logo ? (
								<span className="relative block size-12 overflow-hidden rounded-lg bg-black/5">
									<MediaImage uuid={organizer.logo as string} alt={organizer.name} fill className="object-contain" />
								</span>
							) : null}
							<p className="text-lg font-semibold">{organizer.name}</p>
						</div>
						<ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm opacity-80">
							{organizer.email ? (
								<li>
									<a href={`mailto:${organizer.email}`} className="inline-flex items-center gap-1.5 hover:underline">
										<Mail className="size-3.5" aria-hidden />
										{organizer.email}
									</a>
								</li>
							) : null}
							{organizer.website ? (
								<li>
									<a
										href={organizer.website}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1.5 hover:underline"
									>
										<Globe className="size-3.5" aria-hidden />
										Site
									</a>
								</li>
							) : null}
						</ul>
					</div>
				) : null}
				<div className="space-y-2 text-sm opacity-75 sm:text-right">
					{layout.footer.note ? <p>{layout.footer.note}</p> : null}
					{context.mode === 'preview' ? (
						<span>Evento publicado na plataforma</span>
					) : (
						<Link href="/eventos" className="hover:underline">
							Ver mais eventos na plataforma
						</Link>
					)}
				</div>
			</div>
		</footer>
	);
}
