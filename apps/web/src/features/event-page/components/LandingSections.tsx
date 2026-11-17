import type { EventPageSection, EventTicket } from '@events-manager/contracts';
import { CalendarDays, Clock, ExternalLink, MapPin, Ticket } from 'lucide-react';
import Image from 'next/image';
import MediaImage from '@/components/shared/MediaImage';
import Text from '@/components/ui/Text';
import { EventLocationView } from '@/components/map/EventLocationView';
import { formatEventDateRange, formatEventLocation } from '@/lib/event-schedule';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CountdownTimer } from './CountdownTimer';
import type { LandingContext } from './landing-context';
import { AccentButton, SectionShell } from './LandingPrimitives';

type SectionOf<T extends EventPageSection['type']> = Extract<EventPageSection, { type: T }>;

interface Props<T extends EventPageSection['type']> {
	context: LandingContext;
	section: SectionOf<T>;
}

export function HeroSection({ context, section }: Props<'hero'>) {
	const { event } = context;
	const title = section.title?.trim() || event.title;
	const image =
		section.image ?? (event.cover_image && typeof event.cover_image === 'object' ? event.cover_image : null);
	const date = formatEventDateRange(event.start_date, event.end_date);
	const place = formatEventLocation(
		event.event_type,
		event.location_tbd ? 'Local a definir' : event.location_name,
		event.location_tbd ? null : event.location_address,
	);
	const centered = section.align === 'center';

	return (
		<section id={section.anchor} className="relative isolate overflow-hidden">
			{image || context.previewCoverUrl ? (
				<div className="absolute inset-0 -z-10">
					{context.mode === 'preview' && context.previewCoverUrl ? (
						<Image
							src={context.previewCoverUrl}
							alt={event.cover_image_alt ?? ''}
							fill
							unoptimized
							className="object-cover"
						/>
					) : image ? (
						<MediaImage uuid={image} alt={event.cover_image_alt ?? ''} fill priority className="object-cover" />
					) : null}
					<div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-slate-950/30" />
				</div>
			) : (
				<div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
			)}
			<div
				className={cn(
					'mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-24 text-white sm:px-6 sm:py-32 lg:px-8',
					centered ? 'items-center text-center' : 'items-start',
				)}
			>
				<h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
				{section.subtitle ? <p className="max-w-2xl text-lg text-white/85 sm:text-xl">{section.subtitle}</p> : null}
				<dl className={cn('flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90', centered && 'justify-center')}>
					{section.showDate && date ? (
						<div className="inline-flex items-center gap-2">
							<dt className="sr-only">Quando</dt>
							<CalendarDays className="size-4" aria-hidden />
							<dd>{date}</dd>
						</div>
					) : null}
					{section.showLocation && place ? (
						<div className="inline-flex items-center gap-2">
							<dt className="sr-only">Onde</dt>
							<MapPin className="size-4" aria-hidden />
							<dd>{place}</dd>
						</div>
					) : null}
				</dl>
				<AccentButton context={context} className="mt-2 px-7 py-3.5 text-base">
					{section.ctaLabel}
				</AccentButton>
			</div>
		</section>
	);
}

export function AboutSection({ context, section }: Props<'about'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<Text
				className={cn('prose-base max-w-3xl prose-p:leading-relaxed', context.mode && 'landing-prose')}
				content={section.content}
			/>
		</SectionShell>
	);
}

export function RichtextSection({ section }: Props<'richtext'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<Text className="prose-base max-w-3xl landing-prose prose-p:leading-relaxed" content={section.content} />
		</SectionShell>
	);
}

function ticketAvailability(ticket: EventTicket) {
	const total = Number(ticket.quantity ?? 0);
	const sold = Number(ticket.quantity_sold ?? 0);

	return Math.max(total - sold, 0);
}

export function TicketsSection({ context, section }: Props<'tickets'>) {
	const { event } = context;
	const tickets = (event.tickets ?? []).filter((ticket): ticket is EventTicket => typeof ticket !== 'string');
	const anySale = tickets.some((ticket) => ticketAvailability(ticket) > 0);

	return (
		<SectionShell
			anchor={section.anchor}
			title={section.title}
			subtitle={section.note}
			className="bg-black/[0.03] dark:bg-white/5"
		>
			{event.is_free && tickets.length === 0 ? (
				<p className="text-lg font-medium">Entrada gratuita.</p>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tickets.map((ticket) => {
						const available = ticketAvailability(ticket);
						const soldOut = available <= 0;
						const group = event.ticket_groups?.find((group) => group.id === ticket.group_id);
						const parent = group?.parent_id
							? event.ticket_groups?.find((item) => item.id === group.parent_id)
							: undefined;
						const groupLabel = group ? [parent?.title, group.title].filter(Boolean).join(' / ') : null;

						return (
							<li
								key={ticket.id}
								className={cn(
									'flex flex-col gap-3 rounded-xl border border-current/10 bg-white/70 p-5 dark:bg-white/5',
									soldOut && 'opacity-60',
								)}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h3 className="text-lg font-semibold">{ticket.title}</h3>
										{groupLabel && <p className="text-sm opacity-75">{groupLabel}</p>}
										{ticket.admission_type === 'half_price' && (
											<span className="text-xs font-semibold">Meia-entrada</span>
										)}
										{ticket.description ? <p className="mt-1 text-sm opacity-75">{ticket.description}</p> : null}
									</div>
									<Ticket className="size-5 shrink-0 opacity-60" aria-hidden />
								</div>
								<p className="text-2xl font-bold tabular-nums">
									{formatCurrency(Number(ticket.buyer_price ?? ticket.price ?? 0))}
								</p>
								<p className="text-xs font-medium uppercase tracking-wide opacity-70">
									{soldOut ? 'Esgotado' : `${available} disponíveis`}
								</p>
							</li>
						);
					})}
				</ul>
			)}
			<div className="mt-8">
				<AccentButton context={context} target="checkout" className="px-7 py-3.5 text-base">
					{event.is_free ? 'Inscrever-se' : section.ctaLabel}
				</AccentButton>
				{!anySale && tickets.length > 0 ? (
					<p className="mt-3 text-sm opacity-75">Todos os ingressos foram vendidos.</p>
				) : null}
			</div>
		</SectionShell>
	);
}

export function ScheduleSection({ section }: Props<'schedule'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<ol className="relative space-y-6 border-l border-current/15 pl-6">
				{section.items.map((item) => (
					<li key={item.id} className="relative">
						<span
							className="absolute left-[-1.85rem] top-1.5 size-3 rounded-full"
							style={{ backgroundColor: 'var(--landing-accent)' }}
							aria-hidden
						/>
						<p className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-80">
							<Clock className="size-3.5" aria-hidden />
							{item.time}
						</p>
						<h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
						{item.speaker ? <p className="text-sm opacity-75">{item.speaker}</p> : null}
						{item.description ? <p className="mt-1 text-sm opacity-80">{item.description}</p> : null}
					</li>
				))}
			</ol>
		</SectionShell>
	);
}

export function SpeakersSection({ section }: Props<'speakers'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{section.items.map((speaker) => (
					<li key={speaker.id} className="flex flex-col items-center text-center">
						<div className="relative size-28 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
							{speaker.photo ? (
								<MediaImage uuid={speaker.photo} alt={speaker.name} fill className="object-cover" />
							) : (
								<span className="flex size-full items-center justify-center text-2xl font-bold opacity-60">
									{speaker.name
										.split(' ')
										.slice(0, 2)
										.map((part) => part[0])
										.join('')}
								</span>
							)}
						</div>
						<h3 className="mt-3 text-base font-semibold">{speaker.name}</h3>
						{speaker.role ? <p className="text-sm opacity-75">{speaker.role}</p> : null}
						{speaker.bio ? <p className="mt-2 text-sm opacity-80">{speaker.bio}</p> : null}
					</li>
				))}
			</ul>
		</SectionShell>
	);
}

export function LocationSection({ context, section }: Props<'location'>) {
	const { event } = context;
	const hasCoordinates =
		!event.location_tbd &&
		event.show_map !== false &&
		typeof event.latitude === 'number' &&
		typeof event.longitude === 'number';
	const query = event.location_tbd
		? ''
		: encodeURIComponent([event.location_name, event.location_address].filter(Boolean).join(', '));

	return (
		<SectionShell anchor={section.anchor} title={section.title} subtitle={section.note}>
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-2">
					{event.location_tbd ? (
						<p className="text-lg font-semibold">Local a definir</p>
					) : event.location_name ? (
						<p className="text-lg font-semibold">{event.location_name}</p>
					) : null}
					{!event.location_tbd && event.location_address ? (
						<p className="opacity-80">{event.location_address}</p>
					) : null}
					{event.event_type === 'online' || event.event_type === 'hybrid' ? (
						<p className="opacity-80">Transmissão online para quem participa à distância.</p>
					) : null}
					{query ? (
						<a
							href={`https://www.google.com/maps/search/?api=1&query=${query}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
							style={{ color: 'var(--landing-accent)' }}
						>
							Como chegar
							<ExternalLink className="size-3.5" aria-hidden />
						</a>
					) : null}
				</div>
				{section.showMap && hasCoordinates ? (
					<EventLocationView
						position={{ latitude: event.latitude as number, longitude: event.longitude as number }}
						locationName={event.location_name}
					/>
				) : null}
			</div>
		</SectionShell>
	);
}

export function FaqSection({ section }: Props<'faq'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<div className="max-w-3xl divide-y divide-current/10 rounded-xl border border-current/10">
				{section.items.map((item) => (
					<details key={item.id} className="group px-5 py-4">
						<summary className="cursor-pointer list-none text-base font-semibold marker:content-none">
							{item.question}
						</summary>
						<p className="mt-2 whitespace-pre-line text-sm opacity-80">{item.answer}</p>
					</details>
				))}
			</div>
		</SectionShell>
	);
}

export function GallerySection({ section }: Props<'gallery'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				{section.items.map((item) => (
					<li key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-black/5">
						<MediaImage uuid={item.image} alt={item.caption ?? ''} fill className="object-cover" />
						{item.caption ? (
							<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-xs text-white">
								{item.caption}
							</span>
						) : null}
					</li>
				))}
			</ul>
		</SectionShell>
	);
}

export function SponsorsSection({ section }: Props<'sponsors'>) {
	return (
		<SectionShell anchor={section.anchor} title={section.title}>
			<ul className="flex flex-wrap items-center justify-center gap-8">
				{section.items.map((sponsor) => {
					const logo = (
						<span className="relative block h-14 w-36">
							<MediaImage uuid={sponsor.logo} alt={sponsor.name} fill className="object-contain" />
						</span>
					);

					return (
						<li key={sponsor.id} className="opacity-90 transition-opacity hover:opacity-100">
							{sponsor.url ? (
								<a href={sponsor.url} target="_blank" rel="noopener noreferrer" aria-label={sponsor.name}>
									{logo}
								</a>
							) : (
								logo
							)}
						</li>
					);
				})}
			</ul>
		</SectionShell>
	);
}

export function CtaSection({ context, section }: Props<'cta'>) {
	const external = section.target !== 'tickets';

	return (
		<section id={section.anchor} className="scroll-mt-20 py-14 sm:py-20">
			<div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
				<div
					className="flex flex-col items-start gap-4 rounded-2xl p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10"
					style={{ backgroundColor: 'var(--landing-accent)' }}
				>
					<div>
						<h2 className="text-2xl font-bold sm:text-3xl">{section.headline}</h2>
						{section.text ? <p className="mt-2 max-w-xl text-white/85">{section.text}</p> : null}
					</div>
					<AccentButton
						context={context}
						target={external ? 'url' : 'tickets'}
						href={external ? section.target : undefined}
						className="shrink-0 bg-white !text-slate-900"
					>
						{section.buttonLabel}
					</AccentButton>
				</div>
			</div>
		</section>
	);
}

export function CountdownSection({ context, section }: Props<'countdown'>) {
	return (
		<SectionShell anchor={section.anchor} className="text-center">
			{section.title ? <h2 className="mb-6 text-2xl font-bold sm:text-3xl">{section.title}</h2> : null}
			{section.label ? <p className="mb-6 opacity-80">{section.label}</p> : null}
			<CountdownTimer target={context.event.start_date} />
		</SectionShell>
	);
}
