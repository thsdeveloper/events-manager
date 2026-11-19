import { getYouTubeVideoId, type Event } from '@events-manager/contracts';
import { ArrowLeft, CalendarDays, ChevronRight, Globe2, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Container } from '@/components/design-system/atoms/Container';
import Text from '@/components/ui/Text';
import { formatEventDateRange, formatEventLocation } from '@/lib/event-schedule';
import { descriptionForLanguage, type EventDescriptionLanguage } from '../content';
import { EventVideo } from './EventVideo';
import { EventSectionNavigation } from './EventSectionNavigation';
import { EventCover } from './EventCover';
import { EventLanguageLinks } from './EventLanguageLinks';
import { EventInformation, EventOrganizer, EventSection } from './EventInformation';
import { EventPurchasePanel, MobileEventPurchase } from './EventPurchasePanel';
import { EventTicketOptions } from './EventTicketOptions';
import { EventShareActions } from './EventShareActions';
import { OrganizationEvents } from './OrganizationEvents';
import { organizerOf } from './landing-context';

export interface DefaultEventPageProps {
	event: Event;
	relatedEvents?: Event[];
	language?: EventDescriptionLanguage;
	now?: number;
}

export function DefaultEventPage({
	event,
	relatedEvents = [],
	language = 'pt',
	now = Date.now(),
}: DefaultEventPageProps) {
	const category = event.category_id && typeof event.category_id === 'object' ? event.category_id.name : null;
	const organizer = organizerOf(event);
	const place = formatEventLocation(
		event.event_type,
		event.location_tbd ? 'Local a definir' : event.location_name,
		event.location_tbd ? null : event.location_address,
	);
	const format = event.event_type === 'online' ? 'Online' : event.event_type === 'hybrid' ? 'Híbrido' : 'Presencial';
	const links = [
		{ id: 'sobre', label: 'Sobre' },
		...(getYouTubeVideoId(event.video_url) ? [{ id: 'video', label: 'Vídeo' }] : []),
		{ id: 'ingressos', label: 'Ingressos' },
		{ id: 'quando', label: 'Data e horário' },
		{
			id: event.event_type === 'online' ? 'acesso-online' : 'local',
			label: event.event_type === 'online' ? 'Acesso online' : 'Local',
		},
		...(organizer ? [{ id: 'organizacao', label: 'Organização' }] : []),
	];

	return (
		<main
			id="main-content"
			tabIndex={-1}
			className="min-w-0 bg-[#FBF9FF] pb-8 text-[#231A33] dark:bg-background dark:text-foreground lg:pb-0"
		>
			<Container>
				<nav
					aria-label="Localização na navegação"
					className="flex items-center gap-2 py-5 text-xs text-muted-foreground sm:py-7"
				>
					<Link href="/eventos" className="inline-flex min-h-6 items-center gap-1.5 hover:text-[#743DF5]">
						<ArrowLeft className="size-3.5" aria-hidden />
						Explorar eventos
					</Link>
					<ChevronRight className="size-3" aria-hidden />
					<span className="truncate" aria-current="page">
						{category || 'Detalhes do evento'}
					</span>
				</nav>
				<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-8">
					<div className="min-w-0">
						<EventCover event={event} />
						<div className="pt-6 sm:pt-7">
							<div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD09D]/55 px-3 py-1.5 text-[#58351C]">
									<Sparkles className="size-3" aria-hidden />
									{category || 'Encontro marcado'}
								</span>
								<span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EEFF] px-3 py-1.5 text-[#743DF5]">
									<Globe2 className="size-3" aria-hidden />
									{format}
								</span>
							</div>
							<h1 className="text-balance text-[1.8rem] font-bold leading-[1.15] tracking-[-0.035em] sm:text-4xl lg:text-[2.65rem]">
								{event.title}
							</h1>
							{organizer && (
								<p className="mt-4 text-sm text-muted-foreground">
									Uma realização de{' '}
									<a href="#organizacao" className="font-semibold text-foreground underline-offset-4 hover:underline">
										{organizer.name}
									</a>
								</p>
							)}
							<div className="mt-6 grid gap-4 rounded-2xl border border-[#743DF5]/10 bg-white p-4 dark:bg-card sm:grid-cols-2 sm:p-5">
								<div className="flex items-start gap-3">
									<CalendarDays className="mt-1 size-5 shrink-0 text-[#743DF5]" aria-hidden />
									<div>
										<p className="text-[11px] text-muted-foreground">Reserve a data</p>
										<p className="mt-1 text-sm font-semibold">
											{formatEventDateRange(event.start_date, event.end_date)}
										</p>
										<a href="#quando" className="mt-1 inline-block text-xs text-[#743DF5] hover:underline">
											Ver horários completos
										</a>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<MapPin className="mt-1 size-5 shrink-0 text-[#743DF5]" aria-hidden />
									<div>
										<p className="text-[11px] text-muted-foreground">
											{event.event_type === 'online' ? 'Participe de onde estiver' : 'O ponto de encontro'}
										</p>
										<p className="mt-1 text-sm font-semibold">{place}</p>
										{event.event_type !== 'online' && !event.location_tbd && event.location_city && (
											<p className="mt-1 text-xs text-muted-foreground">
												{[event.location_city, event.location_state].filter(Boolean).join(' · ')}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
					<EventPurchasePanel event={event} now={now} />
					<div className="min-w-0 space-y-5 lg:col-start-1">
						<EventSectionNavigation links={links} />
						<EventSection id="sobre" title="Sobre o evento">
							<EventLanguageLinks event={event} language={language} />
							{event.short_description && language === 'pt' && (
								<p className="mb-4 text-base font-medium leading-relaxed">{event.short_description}</p>
							)}
							<Text
								content={descriptionForLanguage(event, language)}
								className="max-w-none break-words text-sm leading-7 text-muted-foreground prose-p:leading-7 prose-headings:text-foreground"
							/>
							{Boolean(event.tags?.length) && (
								<ul aria-label="Temas do evento" className="mt-6 flex flex-wrap gap-2">
									{event.tags!.map((tag) => (
										<li key={tag} className="rounded-full bg-[#F3EEFF] px-3 py-1.5 text-xs text-[#665B76]">
											#{tag}
										</li>
									))}
								</ul>
							)}
						</EventSection>
						<EventVideo event={event} />
						<EventTicketOptions event={event} now={now} />
						<EventInformation event={event} />
						<EventOrganizer event={event} />
						<div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#F3EEFF] p-5 text-[#231A33] sm:flex-row sm:items-center sm:p-6">
							<div>
								<p className="font-bold">Bons encontros são ainda melhores juntos.</p>
								<p className="mt-1 text-sm text-[#665B76]">Compartilhe o evento com quem vem com você.</p>
							</div>
							<EventShareActions title={event.title} slug={event.slug} />
						</div>
					</div>
				</div>
				<div className="mt-10">
					<OrganizationEvents events={relatedEvents} organizerName={organizer?.name} />
				</div>
			</Container>
			<MobileEventPurchase event={event} now={now} />
		</main>
	);
}
