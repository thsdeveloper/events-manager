'use client';

import 'leaflet/dist/leaflet.css';
import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Roughly centres Brazil, used until the organiser picks a real venue. */
export const FALLBACK_CENTER: [number, number] = [-14.235, -51.9253];
export const FALLBACK_ZOOM = 4;

export interface MapPosition {
	latitude: number;
	longitude: number;
}

interface EventLocationMapProps {
	position: MapPosition | null;
	/** Zoom applied once a position exists. */
	zoom?: number;
	/** Lets the visitor drag/zoom the map. Off for decorative previews. */
	interactive?: boolean;
	/** Allows placing and moving the marker. Implies `interactive`. */
	editable?: boolean;
	onPositionChange?: (position: MapPosition) => void;
	className?: string;
	ariaLabel?: string;
}

/**
 * Leaflet is loaded lazily inside an effect rather than imported at module
 * scope: it touches `window` on evaluation, which would break server rendering.
 *
 * The marker is a `divIcon` instead of Leaflet's default image marker, which
 * needs bundler-specific icon paths and cannot be themed.
 */
function buildMarkerIcon(leaflet: typeof Leaflet, draggable: boolean) {
	return leaflet.divIcon({
		className: 'em-map-marker',
		html: `
			<span class="em-map-marker__pulse"></span>
			<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
				<path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"/>
				<circle cx="12" cy="9" r="2.6" fill="#fff"/>
			</svg>
			${draggable ? '<span class="em-map-marker__hint">arraste</span>' : ''}
		`,
		iconSize: [34, 34],
		iconAnchor: [17, 32],
	});
}

export function EventLocationMap({
	position,
	zoom = 16,
	interactive = true,
	editable = false,
	onPositionChange,
	className,
	ariaLabel = 'Mapa do local do evento',
}: EventLocationMapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<Leaflet.Map | null>(null);
	const markerRef = useRef<Leaflet.Marker | null>(null);
	const leafletRef = useRef<typeof Leaflet | null>(null);
	// Read through a ref so remounting the map is never tied to callback identity.
	const changeHandlerRef = useRef(onPositionChange);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		changeHandlerRef.current = onPositionChange;
	}, [onPositionChange]);

	useEffect(() => {
		let cancelled = false;
		const container = containerRef.current;
		if (!container) return;

		async function setup() {
			try {
				const leaflet = (await import('leaflet')).default;
				if (cancelled || !containerRef.current) return;
				leafletRef.current = leaflet;

				const map = leaflet.map(containerRef.current, {
					center: position ? [position.latitude, position.longitude] : FALLBACK_CENTER,
					zoom: position ? zoom : FALLBACK_ZOOM,
					zoomControl: interactive || editable,
					dragging: interactive || editable,
					// Scrolling the page over a map should scroll the page, not zoom it.
					scrollWheelZoom: false,
					doubleClickZoom: interactive || editable,
					touchZoom: interactive || editable,
					keyboard: interactive || editable,
					attributionControl: true,
				});
				leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
				mapRef.current = map;

				if (editable) {
					map.on('click', (event: Leaflet.LeafletMouseEvent) => {
						changeHandlerRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
					});
				}

				// Leaflet measures the container on creation; inside tabs or freshly
				// mounted panels that measurement can land before layout settles.
				window.setTimeout(() => map.invalidateSize(), 0);
			} catch {
				if (!cancelled) setFailed(true);
			}
		}

		void setup();

		return () => {
			cancelled = true;
			markerRef.current = null;
			mapRef.current?.remove();
			mapRef.current = null;
		};
		// `position` and `zoom` are deliberately not dependencies: recreating the
		// map on every change would fight the user's panning. They are applied by
		// the effect below instead.
	}, [editable, interactive]);

	useEffect(() => {
		const leaflet = leafletRef.current;
		const map = mapRef.current;
		if (!leaflet || !map) return;

		if (!position) {
			markerRef.current?.remove();
			markerRef.current = null;
			map.setView(FALLBACK_CENTER, FALLBACK_ZOOM);

			return;
		}

		const latLng: [number, number] = [position.latitude, position.longitude];
		// Dragging the pin keeps it on screen, so the view is left alone; a search
		// result usually lands off screen, and that is when the map should follow.
		const alreadyVisible = Boolean(markerRef.current) && map.getBounds().contains(latLng);
		if (markerRef.current) {
			markerRef.current.setLatLng(latLng);
		} else {
			const marker = leaflet
				.marker(latLng, { icon: buildMarkerIcon(leaflet, editable), draggable: editable, keyboard: editable })
				.addTo(map);
			if (editable) {
				marker.on('dragend', () => {
					const { lat, lng } = marker.getLatLng();
					changeHandlerRef.current?.({ latitude: lat, longitude: lng });
				});
			}
			markerRef.current = marker;
		}
		if (!alreadyVisible) {
			map.flyTo(latLng, Math.max(map.getZoom(), zoom), { duration: 0.6 });
		}
	}, [editable, position, zoom]);

	if (failed) {
		return (
			<div
				className={cn(
					'flex items-center justify-center rounded-lg border border-dashed bg-muted p-6 text-center text-sm text-muted-foreground',
					className,
				)}
			>
				Não foi possível carregar o mapa.
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			role="application"
			aria-label={ariaLabel}
			className={cn('em-map z-0 overflow-hidden rounded-lg border bg-muted', className)}
		/>
	);
}
