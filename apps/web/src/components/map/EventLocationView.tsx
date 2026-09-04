'use client';

import { ExternalLink } from 'lucide-react';
import { EventLocationMap, type MapPosition } from './EventLocationMap';

interface EventLocationViewProps {
	position: MapPosition;
	locationName?: string | null;
}

/**
 * Public, read-only counterpart of the picker. Scroll-wheel zoom is off in the
 * underlying map so scrolling the page never gets captured by the map.
 */
export function EventLocationView({ position, locationName }: EventLocationViewProps) {
	const directionsUrl = `https://www.openstreetmap.org/directions?to=${position.latitude}%2C${position.longitude}`;

	return (
		<div className="mt-5 space-y-3">
			<EventLocationMap
				position={position}
				zoom={16}
				className="h-72 w-full"
				ariaLabel={locationName ? `Mapa do local: ${locationName}` : 'Mapa do local do evento'}
			/>
			<a
				href={directionsUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 hover:text-purple-900"
			>
				Como chegar
				<ExternalLink className="size-3.5" />
			</a>
		</div>
	);
}
