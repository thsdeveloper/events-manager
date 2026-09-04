'use client';

import type { City, CityWithState, State } from '@events-manager/contracts';
import { Check, ChevronsUpDown, Loader2, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	countMatches,
	fetchCitiesByState,
	fetchCity,
	fetchStates,
	filterByName,
	normalizeForSearch,
} from '@/lib/locations';
import { cn } from '@/lib/utils';

/**
 * Teto de itens desenhados de uma vez. Minas Gerais tem 853 municípios e montar
 * todos eles a cada tecla trava a digitação em aparelho modesto — com o campo de
 * busca logo acima, ninguém rola até o item 100, e o rodapé avisa quando há mais.
 */
const MAX_VISIBLE_OPTIONS = 100;

interface LocationSelectProps {
	/** Código IBGE do município selecionado. */
	value: number | null;
	onChange: (city: CityWithState | null) => void;
	/**
	 * Município já resolvido pelo chamador. Evita uma ida à API só para descobrir
	 * o rótulo do valor inicial — sem ele o componente resolve sozinho.
	 */
	initialCity?: CityWithState | null;
	disabled?: boolean;
	/** Vai no botão de estado, para o `<label>` do formulário apontar para cá. */
	id?: string;
	className?: string;
}

export function LocationSelect({ value, onChange, initialCity, disabled, id, className }: LocationSelectProps) {
	const [states, setStates] = useState<State[]>([]);
	const [statesError, setStatesError] = useState(false);
	const [selectedState, setSelectedState] = useState<State | null>(initialCity?.state ?? null);
	const [selectedCity, setSelectedCity] = useState<CityWithState | null>(initialCity ?? null);

	const [cities, setCities] = useState<City[]>([]);
	const [isLoadingCities, setIsLoadingCities] = useState(false);
	const [citiesError, setCitiesError] = useState(false);

	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				const loaded = await fetchStates();
				if (active) setStates(loaded);
			} catch {
				if (active) setStatesError(true);
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	// Só dispara quando o chamador passou um código sem o município resolvido —
	// uma tela que carregou apenas o id salvo, por exemplo.
	useEffect(() => {
		if (value === null || initialCity || selectedCity?.id === value) return;

		let active = true;
		void (async () => {
			try {
				const city = await fetchCity(value);
				if (!active) return;
				setSelectedCity(city);
				setSelectedState(city.state);
			} catch {
				// Um código salvo que não resolve mais deixa o campo vazio para nova
				// escolha, em vez de travar o formulário com um erro.
			}
		})();

		return () => {
			active = false;
		};
	}, [value, initialCity, selectedCity?.id]);

	useEffect(() => {
		if (!selectedState) {
			setCities([]);

			return;
		}

		let active = true;
		setIsLoadingCities(true);
		setCitiesError(false);
		void (async () => {
			try {
				const loaded = await fetchCitiesByState(selectedState.id);
				if (active) setCities(loaded);
			} catch {
				if (active) setCitiesError(true);
			} finally {
				if (active) setIsLoadingCities(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [selectedState]);

	const handleStateChange = (state: State) => {
		if (state.id === selectedState?.id) return;

		setSelectedState(state);
		// A cidade anterior pertence a outro estado, então deixa de valer.
		setSelectedCity(null);
		onChange(null);
	};

	const handleCityChange = (city: City) => {
		if (!selectedState) return;

		const resolved: CityWithState = { ...city, state: selectedState };
		setSelectedCity(resolved);
		onChange(resolved);
	};

	return (
		<div className={cn('grid gap-3 sm:grid-cols-2', className)}>
			<SearchableSelect
				id={id}
				ariaLabel="Estado"
				disabled={disabled}
				emptyMessage={statesError ? 'Não foi possível carregar os estados.' : 'Nenhum estado encontrado.'}
				isLoading={states.length === 0 && !statesError}
				options={states}
				placeholder="Estado"
				searchPlaceholder="Buscar estado..."
				selectedId={selectedState?.id ?? null}
				toLabel={(state) => `${state.name} (${state.uf})`}
				onSelect={handleStateChange}
			/>

			<SearchableSelect
				ariaLabel="Cidade"
				disabled={disabled || !selectedState}
				emptyMessage={citiesError ? 'Não foi possível carregar as cidades.' : 'Nenhuma cidade encontrada.'}
				isLoading={isLoadingCities}
				options={cities}
				placeholder={selectedState ? 'Cidade' : 'Escolha o estado primeiro'}
				searchPlaceholder="Buscar cidade..."
				selectedId={selectedCity?.id ?? null}
				toLabel={(city) => city.name}
				onSelect={handleCityChange}
			/>
		</div>
	);
}

interface SearchableSelectProps<T extends { id: number }> {
	ariaLabel: string;
	disabled?: boolean;
	emptyMessage: string;
	id?: string;
	isLoading: boolean;
	onSelect: (option: T) => void;
	options: T[];
	placeholder: string;
	searchPlaceholder: string;
	selectedId: number | null;
	toLabel: (option: T) => string;
}

function SearchableSelect<T extends { id: number }>({
	ariaLabel,
	disabled,
	emptyMessage,
	id,
	isLoading,
	onSelect,
	options,
	placeholder,
	searchPlaceholder,
	selectedId,
	toLabel,
}: SearchableSelectProps<T>) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const listRef = useRef<HTMLDivElement>(null);

	// Normaliza uma vez por lista, e não uma vez por tecla: são até 853 nomes, e
	// refazer isso a cada caractere é o que torna a digitação pesada.
	const searchable = useMemo(
		() => options.map((option) => ({ option, search: normalizeForSearch(toLabel(option)) })),
		[options, toLabel],
	);

	const matches = useMemo(() => filterByName(searchable, query, MAX_VISIBLE_OPTIONS), [query, searchable]);
	const totalMatching = useMemo(() => countMatches(searchable, query), [query, searchable]);

	const selected = options.find((option) => option.id === selectedId) ?? null;

	// Volta ao topo quando a busca muda: sem isso a lista continua rolada na
	// posição anterior e o primeiro resultado nasce fora da vista.
	useEffect(() => {
		listRef.current?.scrollTo({ top: 0 });
	}, [query]);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setQuery('');
			}}
		>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					aria-label={ariaLabel}
					className="h-11 w-full justify-between rounded-lg px-3 font-normal"
					disabled={disabled}
					id={id}
					role="combobox"
					type="button"
					variant="outline"
				>
					<span className={cn('flex min-w-0 items-center gap-2', !selected && 'text-muted-foreground')}>
						<MapPin aria-hidden="true" className="size-4 shrink-0 opacity-60" />
						<span className="truncate">{selected ? toLabel(selected) : placeholder}</span>
					</span>
					<ChevronsUpDown aria-hidden="true" className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>

			<PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
				{/* `shouldFilter={false}`: o filtro é feito acima, sobre nomes já
				    normalizados e com um teto de itens. O filtro embutido do cmdk
				    percorreria e redesenharia a lista inteira a cada tecla. */}
				<Command shouldFilter={false}>
					<CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
					<CommandList ref={listRef} className="max-h-64">
						{isLoading ? (
							<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
								<Loader2 aria-hidden="true" className="size-4 animate-spin" />
								Carregando...
							</div>
						) : (
							<>
								<CommandEmpty>{emptyMessage}</CommandEmpty>
								<CommandGroup>
									{matches.map((option) => (
										<CommandItem
											key={option.id}
											value={String(option.id)}
											onSelect={() => {
												onSelect(option);
												setOpen(false);
											}}
										>
											<Check
												aria-hidden="true"
												className={cn('mr-2 size-4', option.id === selectedId ? 'opacity-100' : 'opacity-0')}
											/>
											{toLabel(option)}
										</CommandItem>
									))}
								</CommandGroup>
								{totalMatching > matches.length && (
									<p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
										Mostrando {matches.length} de {totalMatching}. Digite para refinar.
									</p>
								)}
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default LocationSelect;
