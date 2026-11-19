import type { Event } from '@events-manager/contracts';
import { ArrowUpRight, Building2, CalendarDays, Globe2, Mail, MapPin, Phone, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import MediaImage from '@/components/shared/MediaImage';
import Text from '@/components/ui/Text';
import { EventLocationView } from '@/components/map/EventLocationView';
import { eventAddress, eventDateTime } from '../public-event';
import { organizerOf } from './landing-context';

export function EventSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			style={{
				scrollMarginTop: 'calc(var(--event-header-height, 5rem) + var(--event-navigation-height, 7rem) + 1rem)',
			}}
			className="rounded-2xl border border-[#743DF5]/10 bg-white p-5 dark:bg-card sm:rounded-3xl sm:p-8"
		>
			<h2 id={`${id}-title`} className="mb-5 text-xl font-bold tracking-tight sm:text-2xl">
				{title}
			</h2>
			{children}
		</section>
	);
}

export function EventInformation({ event }: { event: Event }) {
	const online = event.event_type === 'online';
	const hasCoordinates = typeof event.latitude === 'number' && typeof event.longitude === 'number';
	const address = eventAddress(event);

	return (
		<>
			<EventSection id="quando" title="Programe-se para o encontro">
				<dl className="grid gap-5 sm:grid-cols-2">
					{[
						{ title: 'Começa', date: event.start_date },
						{ title: 'Termina', date: event.end_date },
					].map((item) => (
						<div key={item.title} className="flex gap-3">
							<CalendarDays className="mt-1 size-5 shrink-0 text-[#743DF5]" aria-hidden />
							<div>
								<dt className="text-xs font-medium text-muted-foreground">{item.title}</dt>
								<dd className="mt-1 text-sm font-semibold">
									<time dateTime={item.date}>{eventDateTime(item.date)}</time>
								</dd>
							</div>
						</div>
					))}
					{event.registration_start && (
						<div>
							<dt className="text-xs text-muted-foreground">Início das inscrições</dt>
							<dd className="mt-1 text-sm">{eventDateTime(event.registration_start)}</dd>
						</div>
					)}
					{event.registration_end && (
						<div>
							<dt className="text-xs text-muted-foreground">Encerramento das inscrições</dt>
							<dd className="mt-1 text-sm">{eventDateTime(event.registration_end)}</dd>
						</div>
					)}
					{Boolean(event.max_attendees) && (
						<div className="flex items-center gap-3">
							<Users className="size-5 text-[#743DF5]" aria-hidden />
							<div>
								<dt className="text-xs text-muted-foreground">Capacidade do evento</dt>
								<dd className="mt-1 text-sm">{event.max_attendees!.toLocaleString('pt-BR')} participantes</dd>
							</div>
						</div>
					)}
				</dl>
				<p className="mt-5 text-xs text-muted-foreground">Horários de Brasília (GMT−3).</p>
			</EventSection>
			{!online && (
				<EventSection id="local" title="Onde vamos nos encontrar">
					<div className="flex gap-3">
						<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F3EEFF] text-[#743DF5]">
							<MapPin className="size-5" aria-hidden />
						</span>
						<div>
							<h3 className="font-semibold">
								{event.location_tbd ? 'Local a definir' : event.location_name || 'Local a confirmar'}
							</h3>
							{!event.location_tbd && address && (
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{address}</p>
							)}
						</div>
					</div>
					{!event.location_tbd && event.show_map !== false && hasCoordinates ? (
						<EventLocationView
							position={{ latitude: event.latitude!, longitude: event.longitude! }}
							locationName={event.location_name}
						/>
					) : !event.location_tbd && address ? (
						<a
							href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.location_name, address].filter(Boolean).join(', '))}`}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#743DF5]"
						>
							Como chegar
							<ArrowUpRight className="size-4" aria-hidden />
						</a>
					) : (
						<p className="mt-4 text-sm text-muted-foreground">
							Acompanhe esta página para as atualizações da organização.
						</p>
					)}
				</EventSection>
			)}
			{(online || event.event_type === 'hybrid') && (
				<EventSection id="acesso-online" title="Acesso online">
					<div className="flex gap-3">
						<Globe2 className="size-6 shrink-0 text-[#743DF5]" aria-hidden />
						<p className="text-sm leading-relaxed text-muted-foreground">
							O link de acesso fica disponível nos detalhes do ingresso após a confirmação.
						</p>
					</div>
				</EventSection>
			)}
		</>
	);
}

export function EventOrganizer({ event }: { event: Event }) {
	const organizer = organizerOf(event);
	if (!organizer) return null;
	const website = organizer.website && /^https?:\/\//i.test(organizer.website) ? organizer.website : null;

	return (
		<EventSection id="organizacao" title="Quem faz acontecer">
			<div className="flex items-center gap-4">
				<div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F3EEFF] text-[#743DF5]">
					{organizer.logo ? (
						<MediaImage uuid={organizer.logo} alt={organizer.name} fill sizes="64px" className="object-contain p-2" />
					) : (
						<Building2 className="size-7" aria-hidden />
					)}
				</div>
				<div>
					<p className="mb-1 text-xs text-muted-foreground">Organização do evento</p>
					<h3 className="text-lg font-bold">{organizer.name}</h3>
				</div>
			</div>
			{organizer.description && (
				<Text
					content={organizer.description}
					className="mt-5 text-sm leading-relaxed text-muted-foreground prose-p:leading-relaxed"
				/>
			)}
			<div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#743DF5]/10 pt-4 text-sm">
				{organizer.email && (
					<a
						href={`mailto:${organizer.email}`}
						className="inline-flex min-h-11 min-w-0 items-center gap-2 break-all text-[#743DF5] hover:underline"
					>
						<Mail className="size-4 shrink-0" aria-hidden />
						{organizer.email}
					</a>
				)}
				{organizer.phone && (
					<a
						href={`tel:${organizer.phone}`}
						className="inline-flex min-h-11 items-center gap-2 text-[#743DF5] hover:underline"
					>
						<Phone className="size-4" aria-hidden />
						{organizer.phone}
					</a>
				)}
				{website && (
					<a
						href={website}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex min-h-11 items-center gap-2 text-[#743DF5] hover:underline"
					>
						<Globe2 className="size-4" aria-hidden />
						Site da organização
						<ArrowUpRight className="size-3.5" aria-hidden />
					</a>
				)}
			</div>
		</EventSection>
	);
}
