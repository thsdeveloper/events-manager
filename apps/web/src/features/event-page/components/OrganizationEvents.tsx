import type { Event } from '@events-manager/contracts';
import { ArrowUpRight, CalendarDays, MapPin, Ticket } from 'lucide-react';
import Link from 'next/link';
import MediaImage from '@/components/shared/MediaImage';
import { formatEventDateRange, formatEventLocation } from '@/lib/event-schedule';

export function OrganizationEvents({ events, organizerName }: { events: Event[]; organizerName?: string }) {
	if (!events.length) return null;

	return (
		<section aria-labelledby="organization-events-title" className="border-t border-[#743DF5]/10 py-10 sm:py-14">
			<div className="mb-6">
				<p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#743DF5]">Continue descobrindo</p>
				<h2 id="organization-events-title" className="text-2xl font-bold tracking-tight">
					Mais encontros com esta organização
				</h2>
				{organizerName && (
					<p className="mt-2 text-sm text-muted-foreground">Outros eventos de {organizerName} para sua agenda.</p>
				)}
			</div>
			<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{events.map((event) => (
					<li key={event.id} className="min-w-0">
						<Link
							href={`/eventos/${event.slug}`}
							className="group flex h-full gap-3 rounded-2xl border border-[#743DF5]/10 bg-white p-3 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#743DF5] dark:bg-card sm:block"
						>
							<div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-[#F3EEFF] sm:aspect-video sm:w-full">
								{event.cover_image ? (
									<MediaImage
										uuid={event.cover_image}
										alt=""
										fill
										sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 96px"
										className="object-contain"
									/>
								) : (
									<Ticket className="absolute inset-0 m-auto size-9 text-[#743DF5]" aria-hidden />
								)}
							</div>
							<div className="min-w-0 flex-1 sm:pt-4">
								<div className="flex items-start gap-2">
									<h3 className="line-clamp-2 text-sm font-bold group-hover:text-[#743DF5]">{event.title}</h3>
									<ArrowUpRight className="ml-auto size-4 shrink-0 text-[#743DF5]" aria-hidden />
								</div>
								<p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
									<CalendarDays className="size-3.5 shrink-0" aria-hidden />
									{formatEventDateRange(event.start_date, event.end_date)}
								</p>
								<p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
									<MapPin className="size-3.5 shrink-0" aria-hidden />
									{formatEventLocation(event.event_type, event.location_name, null)}
								</p>
								{event.is_free && <p className="mt-3 text-xs font-semibold text-[#743DF5]">Gratuito</p>}
							</div>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
