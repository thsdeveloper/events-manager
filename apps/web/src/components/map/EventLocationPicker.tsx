'use client';

import { Crosshair, Loader2, MapPin, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EventLocationMap, type MapPosition } from './EventLocationMap';

interface PlaceSuggestion {
	placeId: string;
	description: string;
	mainText: string;
	secondaryText: string | null;
	latitude: number;
	longitude: number;
}

export interface PickedLocation extends MapPosition {
	/** Full address as the geocoder spells it. */
	address: string;
	/** Short headline, suitable as a venue name suggestion. */
	name: string;
}

interface EventLocationPickerProps {
	position: MapPosition | null;
	onPick: (location: PickedLocation) => void;
	onClear: () => void;
	className?: string;
}

export function EventLocationPicker({ position, onPick, onClear, className }: EventLocationPickerProps) {
	const [query, setQuery] = useState('');
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isResolving, setIsResolving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const searchController = useRef<AbortController | null>(null);
	// Selecting a suggestion writes into the input, which would otherwise trigger
	// a fresh search for the text we just filled in.
	const skipNextSearch = useRef(false);

	useEffect(() => {
		if (skipNextSearch.current) {
			skipNextSearch.current = false;

			return;
		}

		const term = query.trim();
		if (term.length < 3) {
			setSuggestions([]);
			setError(null);

			return;
		}

		const timeoutId = window.setTimeout(async () => {
			searchController.current?.abort();
			const controller = new AbortController();
			searchController.current = controller;
			setIsSearching(true);
			setError(null);
			try {
				const response = await fetch(`/api/places/search?input=${encodeURIComponent(term)}`, {
					signal: controller.signal,
				});
				const body = await response.json().catch(() => null);
				if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível buscar endereços.');
				setSuggestions(Array.isArray(body?.predictions) ? body.predictions : []);
			} catch (searchError) {
				if ((searchError as Error).name !== 'AbortError') {
					setError(searchError instanceof Error ? searchError.message : 'Não foi possível buscar endereços.');
					setSuggestions([]);
				}
			} finally {
				setIsSearching(false);
			}
		}, 400);

		return () => window.clearTimeout(timeoutId);
	}, [query]);

	const handleSuggestion = (suggestion: PlaceSuggestion) => {
		skipNextSearch.current = true;
		setQuery(suggestion.description);
		setSuggestions([]);
		onPick({
			latitude: suggestion.latitude,
			longitude: suggestion.longitude,
			address: suggestion.description,
			name: suggestion.mainText,
		});
	};

	/** Dropping or dragging the pin resolves the address behind those coordinates. */
	const handleMapPosition = useCallback(
		async (next: MapPosition) => {
			setIsResolving(true);
			setError(null);
			try {
				const response = await fetch(`/api/places/reverse?lat=${next.latitude}&lon=${next.longitude}`);
				const body = await response.json().catch(() => null);
				if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível identificar o endereço.');
				const place = body?.place as PlaceSuggestion | null;
				skipNextSearch.current = true;
				setQuery(place?.description ?? '');
				onPick({
					...next,
					address: place?.description ?? '',
					name: place?.mainText ?? '',
				});
			} catch (reverseError) {
				// The pin is still valid even when naming it fails, so it is kept.
				setError(reverseError instanceof Error ? reverseError.message : 'Não foi possível identificar o endereço.');
				onPick({ ...next, address: '', name: '' });
			} finally {
				setIsResolving(false);
			}
		},
		[onPick],
	);

	const handleClear = () => {
		skipNextSearch.current = true;
		setQuery('');
		setSuggestions([]);
		setError(null);
		onClear();
	};

	return (
		<div className={cn('space-y-3', className)}>
			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder="Busque pelo endereço ou nome do local"
					autoComplete="off"
					aria-label="Buscar endereço no mapa"
					className="px-9"
				/>
				{(isSearching || isResolving) && (
					<Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
				)}

				{suggestions.length > 0 && (
					<ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg">
						{suggestions.map(suggestion => (
							<li key={suggestion.placeId}>
								<button
									type="button"
									onClick={() => handleSuggestion(suggestion)}
									className="flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left last:border-none hover:bg-muted"
								>
									<MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
									<span className="min-w-0">
										<span className="block truncate text-sm font-medium">{suggestion.mainText}</span>
										{suggestion.secondaryText && (
											<span className="block truncate text-xs text-muted-foreground">
												{suggestion.secondaryText}
											</span>
										)}
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<EventLocationMap
				position={position}
				editable
				className="h-72 w-full"
				ariaLabel="Mapa para definir o local do evento"
			/>

			<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
				<p className="flex items-center gap-1.5">
					<Crosshair className="size-3.5" />
					{position
						? `Pino em ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
						: 'Clique no mapa ou busque um endereço para marcar o local.'}
				</p>
				{position && (
					<button
						type="button"
						onClick={handleClear}
						className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-destructive hover:bg-destructive/10"
					>
						<Trash2 className="size-3.5" />
						Remover pino
					</button>
				)}
			</div>

			{error && (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
