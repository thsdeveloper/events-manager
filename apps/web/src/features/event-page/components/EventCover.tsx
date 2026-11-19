import type { Event } from '@events-manager/contracts';
import Image from 'next/image';
import { Ticket } from 'lucide-react';
import MediaImage from '@/components/shared/MediaImage';

/** A arte é conteúdo: mostrar inteira, sem recorte e sem texto sobreposto. */
export function EventCover({
	event,
	image = event.cover_image,
	previewUrl,
}: {
	event: Event;
	image?: Event['cover_image'];
	previewUrl?: string | null;
}) {
	const dimensions = image && typeof image === 'object' ? image : null;
	const props = {
		alt: event.cover_image_alt || `Capa de ${event.title}`,
		width: dimensions?.width || 1600,
		height: dimensions?.height || 900,
		className: 'h-auto max-h-[32rem] w-full object-contain',
		sizes: '(min-width: 1280px) 800px, (min-width: 1024px) 65vw, 100vw',
		priority: true,
	};

	return (
		<div className="overflow-hidden rounded-2xl border border-[#743DF5]/10 bg-[#F3EEFF] sm:rounded-3xl">
			{previewUrl ? (
				<Image {...props} src={previewUrl} unoptimized />
			) : image ? (
				<MediaImage {...props} uuid={image} />
			) : (
				<div className="flex aspect-[16/7] items-center justify-center bg-[radial-gradient(ellipse_at_top_right,#FFD09D,transparent_65%)]">
					<Ticket className="size-20 -rotate-12 text-[#743DF5]" strokeWidth={1} aria-hidden />
				</div>
			)}
		</div>
	);
}
