'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, MonitorSmartphone, Users } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { EventWizardFormValues } from '../types';

interface PlaceSuggestion {
	placeId: string;
	description: string;
	mainText: string;
	secondaryText?: string;
}

const EVENT_TYPE_OPTIONS = [
	{
		id: 'in_person' as const,
		title: 'Presencial',
		description: 'Ideal para experiências imersivas e networking cara a cara.',
		icon: Users,
	},
	{
		id: 'online' as const,
		title: 'Online',
		description: 'Alcance participantes de qualquer lugar, ao vivo ou gravado.',
		icon: MonitorSmartphone,
	},
	{
		id: 'hybrid' as const,
		title: 'Híbrido',
		description: 'Combine uma experiência ao vivo com transmissão online.',
		icon: MapPin,
	},
];

export function LocationStep() {
	const form = useFormContext<EventWizardFormValues>();
	const eventType = form.watch('event_type');
	const [addressQuery, setAddressQuery] = useState(form.getValues('location_address') ?? '');
	const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
	const [isSearchingAddress, setIsSearchingAddress] = useState(false);
	const [autocompleteError, setAutocompleteError] = useState<string | null>(null);
	const autocompleteController = useRef<AbortController | null>(null);

	const fetchAddressSuggestions = useCallback(
		async (input: string) => {
			if (!input || input.length < 3) {
				setAddressSuggestions([]);
				setAutocompleteError(null);

				return;
			}

			if (autocompleteController.current) {
				autocompleteController.current.abort();
			}

			const controller = new AbortController();
			autocompleteController.current = controller;
			setIsSearchingAddress(true);
			setAutocompleteError(null);

			try {
				const response = await fetch(`/api/places/search?input=${encodeURIComponent(input)}`, {
					signal: controller.signal,
				});

				if (!response.ok) {
					let message = 'Não foi possível buscar sugestões.';
					try {
						const data = await response.json();
						message = data?.error ?? message;
					} catch {
						// ignore
					}

					setAutocompleteError(message);
					setAddressSuggestions([]);

					return;
				}

				const data = await response.json();
				setAddressSuggestions(Array.isArray(data?.predictions) ? data.predictions : []);
			} catch (error) {
				if ((error as Error).name !== 'AbortError') {
					setAutocompleteError('Não foi possível buscar sugestões.');
				}
			} finally {
				setIsSearchingAddress(false);
			}
		},
		[],
	);

	useEffect(() => {
		if (eventType !== 'in_person' && eventType !== 'hybrid') {
			setAddressSuggestions([]);
			setIsSearchingAddress(false);

			return;
		}

		const timeoutId = window.setTimeout(() => {
			fetchAddressSuggestions(addressQuery.trim());
		}, 350);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [addressQuery, eventType, fetchAddressSuggestions]);

	const handleAddressSelect = (suggestion: PlaceSuggestion) => {
		setAddressSuggestions([]);
		setAddressQuery(suggestion.description);
		form.setValue('location_address', suggestion.description, { shouldDirty: true, shouldValidate: true });

		if (!form.getValues('location_name')) {
			form.setValue('location_name', suggestion.mainText, { shouldDirty: true, shouldValidate: true });
		}
	};

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Formato e localização</h2>
							<p className="text-sm text-muted-foreground">
								Escolha o formato que faz mais sentido e informe como o público chega até o evento.
							</p>
						</div>
					</div>

					<div className="mt-6 space-y-6">
					<div>
						<h3 className="text-sm font-medium">Formato do evento</h3>
						<div className="mt-4 grid gap-3 md:grid-cols-3">
							{EVENT_TYPE_OPTIONS.map(option => {
								const Icon = option.icon;
								const isActive = eventType === option.id;

								return (
									<button
										type="button"
										key={option.id}
										onClick={() =>
											form.setValue('event_type', option.id, { shouldDirty: true, shouldValidate: true })
										}
										className={cn(
											'flex h-full flex-col gap-3 rounded-lg border p-4 text-left transition-all',
											isActive
												? 'border-primary bg-primary/10 shadow-sm'
												: 'border-border hover:border-primary/40 hover:bg-muted',
										)}
									>
										<div className="flex items-center gap-3">
											<span className={cn('rounded-full p-2', isActive ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
												<Icon className="size-4" />
											</span>
											<span className="font-medium">{option.title}</span>
										</div>
										<p className="text-xs text-muted-foreground">{option.description}</p>
									</button>
								);
							})}
						</div>
						{form.formState.errors.event_type?.message && (
							<p className="mt-2 text-sm font-medium text-destructive">
								{form.formState.errors.event_type.message}
							</p>
						)}
					</div>

					{(eventType === 'in_person' || eventType === 'hybrid') && (
						<div className="rounded-lg border border-dashed p-4">
							<h3 className="text-sm font-medium">Detalhes do local</h3>
							<p className="text-xs text-muted-foreground">
								Capriche nas informações para facilitar a chegada dos participantes.
							</p>

							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="location_name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nome do local</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Ex: Hub Inovação Paulista" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="location_address"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Endereço completo</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														{...field}
														placeholder="Rua, número, bairro, cidade e estado"
														autoComplete="off"
														onChange={event => {
															field.onChange(event.target.value);
															setAddressQuery(event.target.value);
														}}
														onFocus={event => {
															setAddressQuery(event.target.value);
														}}
													/>
													{(isSearchingAddress || addressSuggestions.length > 0 || autocompleteError) && (
									<div className="absolute inset-x-0 top-full z-30 mt-1 rounded-md border bg-background shadow-lg">
															{isSearchingAddress && (
																<div className="px-3 py-2 text-xs text-muted-foreground">Buscando sugestões...</div>
															)}

															{autocompleteError && !isSearchingAddress && (
																<div className="px-3 py-2 text-xs text-destructive">{autocompleteError}</div>
															)}

															{!isSearchingAddress && !autocompleteError && addressSuggestions.length === 0 && addressQuery && (
																<div className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado encontrado.</div>
															)}

															{addressSuggestions.length > 0 && (
																<ul className="max-h-56 overflow-y-auto text-sm">
																	{addressSuggestions.map(suggestion => (
																		<li
																			key={suggestion.placeId}
																			className="cursor-pointer border-b border-border/60 px-3 py-2 last:border-none hover:bg-muted"
																			onMouseDown={event => {
																				event.preventDefault();
																				handleAddressSelect(suggestion);
																			}}
																		>
																			<p className="font-medium text-foreground">{suggestion.mainText}</p>
																			{suggestion.secondaryText && (
																				<p className="text-xs text-muted-foreground">{suggestion.secondaryText}</p>
																			)}
																		</li>
																	))}
																</ul>
															)}
														</div>
													)}
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
								Dica: adicione pontos de referência ou instruções especiais se necessário.
							</p>
						</div>
					)}

					{(eventType === 'online' || eventType === 'hybrid') && (
						<div className="rounded-lg border border-dashed p-4">
							<h3 className="text-sm font-medium">Transmissão online</h3>
							<p className="text-xs text-muted-foreground">
								Informe a URL e, se quiser, o nome da plataforma. Enviaremos somente para inscritos confirmados.
							</p>

							<FormField
								control={form.control}
								name="online_url"
								render={({ field }) => (
									<FormItem className="mt-4">
										<FormLabel>Link de acesso</FormLabel>
										<FormControl>
											<Input {...field} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}
					</div>
				</div>
			</div>
		</div>
	);
}
