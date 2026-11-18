'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { BlockEventHighlight } from '@events-manager/contracts';
import Button from '@/components/blocks/Button';
import MediaImage from '@/components/shared/MediaImage';
import Container from '@/components/ui/container';
import { Button as NavigationButton } from '@/components/ui/button';
import { formatEventDateRange, formatEventLocation } from '@/lib/event-schedule';
import { cn } from '@/lib/utils';

const imagePositions = { left: 'object-left', center: 'object-center', right: 'object-right' };

/** A full-width event promotion; the same artwork supplies its decorative backdrop. */
export default function EventHighlight({ data }: { data: BlockEventHighlight }) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const events = data.events ?? [];
	const slider = data.display_mode === 'slider' && events.length > 1;
	const currentIndex = slider ? selectedIndex % events.length : 0;
	const event = events[currentIndex];
	if (!event) return null;
	const details = [
		formatEventDateRange(event.start_date, event.end_date),
		formatEventLocation(event.event_type, event.location_name, event.location_address),
	]
		.filter(Boolean)
		.join(', ');

	return (
		<div className="relative isolate overflow-hidden bg-[#012a4f] text-white [font-variation-settings:'opsz'_14]">
			{event.cover_image && (
				<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] blur-[9.1px]">
					<MediaImage uuid={event.cover_image} alt="" fill sizes="100vw" className="object-cover" />
				</div>
			)}
			<Container className="py-8 lg:py-5">
				<div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,548fr)_minmax(0,617fr)] lg:gap-[47px]">
					<div className="min-w-0 break-words lg:pb-8 lg:pt-16">
						<h2 className="max-w-[423px] whitespace-pre-line text-3xl/[1.3] font-semibold tracking-[-0.04em] sm:text-4xl/[47px]">
							{event.title}
						</h2>
						{event.short_description && (
							<p className="mt-[13px] whitespace-pre-line text-lg/[1.3] tracking-[-0.04em] sm:text-xl/[26px]">
								{event.short_description}
							</p>
						)}
						{details && (
							<p className="mt-[15px] whitespace-pre-line text-lg/[1.3] font-bold tracking-[-0.04em] sm:text-xl/[26px]">
								{details}
							</p>
						)}
						<Button
							id={`${data.id}-tickets`}
							type="url"
							label={data.button_label}
							url={`/eventos/${event.slug}`}
							className="mt-[23px] h-auto min-h-[45px] min-w-[203px] max-w-full whitespace-normal rounded-full bg-[#743df5] px-[34px] py-3 text-center text-base font-semibold leading-[21px] tracking-[-0.04em] text-white hover:bg-[#6530df] focus-visible:ring-white"
						/>
						{slider && (
							<div className="mt-5 flex items-center gap-3">
								<NavigationButton
									type="button"
									variant="ghost"
									size="icon"
									aria-label="Evento anterior"
									onClick={() => setSelectedIndex((currentIndex + events.length - 1) % events.length)}
									className="rounded-full border border-white/40 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white"
								>
									<ArrowLeft aria-hidden="true" className="size-4" />
								</NavigationButton>
								<p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-white/80">
									Evento {currentIndex + 1} de {events.length}
									<span className="sr-only">: {event.title}</span>
								</p>
								<NavigationButton
									type="button"
									variant="ghost"
									size="icon"
									aria-label="Próximo evento"
									onClick={() => setSelectedIndex((currentIndex + 1) % events.length)}
									className="rounded-full border border-white/40 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white"
								>
									<ArrowRight aria-hidden="true" className="size-4" />
								</NavigationButton>
							</div>
						)}
					</div>
					{event.cover_image && (
						<div className="relative aspect-[617/475] min-w-0 overflow-hidden rounded-[20px]">
							<MediaImage
								uuid={event.cover_image}
								alt={event.cover_image_alt || event.title}
								fill
								sizes="(min-width: 1280px) 619px, (min-width: 1024px) 50vw, 100vw"
								className={cn('object-cover', imagePositions[data.image_position] ?? imagePositions.right)}
							/>
						</div>
					)}
				</div>
			</Container>
		</div>
	);
}
