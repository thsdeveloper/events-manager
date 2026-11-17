import type { EventCategory, MediaFile } from '@events-manager/contracts';
import { Calendar, Clock, DollarSign, Globe } from 'lucide-react';
import MediaImage from '@/components/shared/MediaImage';
import { resolveCategoryIcon } from '@/features/categories/icons';
import { Heading } from '../atoms/Heading';
import { Container } from '../atoms/Container';
import { OverlayBadge } from '../molecules/OverlayBadge';
import { OverlayFact } from '../molecules/OverlayFact';

export interface EventHeroProps {
	category: Pick<EventCategory, 'name' | 'icon' | 'color'> | null;
	coverImage?: string | MediaFile | null;
	coverImageAlt?: string | null;
	dateLabel: string;
	formatLabel: string;
	isFree?: boolean;
	timeLabel: string;
	title: string;
}

/**
 * Faixa de capa da página pública do evento. O conteúdo é alinhado pelo mesmo
 * `Container` do restante da página, para que o título comece exatamente na
 * coluna dos cards abaixo dele.
 */
export function EventHero({
	category,
	coverImage,
	coverImageAlt,
	dateLabel,
	formatLabel,
	isFree,
	timeLabel,
	title,
}: EventHeroProps) {
	return (
		<div className="relative h-[420px] overflow-hidden md:h-[520px]">
			{coverImage ? (
				<MediaImage uuid={coverImage} alt={coverImageAlt?.trim() || title} fill priority className="object-cover" />
			) : (
				<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-indigo-600 to-blue-600">
					<Calendar className="size-32 text-white opacity-30" aria-hidden />
				</div>
			)}

			<div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />

			<Container className="absolute inset-x-0 bottom-0 pb-8 md:pb-12">
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2 sm:gap-3">
						{category && (
							<OverlayBadge accentColor={category.color} icon={resolveCategoryIcon(category.icon)}>
								{category.name}
							</OverlayBadge>
						)}

						<OverlayBadge icon={Globe}>{formatLabel}</OverlayBadge>

						{isFree && (
							<OverlayBadge icon={DollarSign} tone="success">
								Gratuito
							</OverlayBadge>
						)}
					</div>

					<Heading as="h1" level="h1" className="text-white drop-shadow-lg sm:text-4xl md:text-5xl md:font-bold">
						{title}
					</Heading>

					<div className="flex flex-wrap gap-3 sm:gap-4">
						<OverlayFact icon={Calendar} label="Data" value={dateLabel} />
						<OverlayFact icon={Clock} label="Horário" value={timeLabel} valueClassName="capitalize" />
					</div>
				</div>
			</Container>
		</div>
	);
}
