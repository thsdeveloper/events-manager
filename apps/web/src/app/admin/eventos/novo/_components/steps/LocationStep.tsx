'use client';

import { useCallback } from 'react';
import { MapPin, MonitorSmartphone, Users } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EventLocationPicker, type PickedLocation } from '@/components/map/EventLocationPicker';
import { cn } from '@/lib/utils';
import type { EventWizardFormValues } from '../types';

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
	const latitude = form.watch('latitude');
	const longitude = form.watch('longitude');
	const position =
		typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null;

	const handlePick = useCallback(
		(location: PickedLocation) => {
			const options = { shouldDirty: true, shouldValidate: true } as const;
			form.setValue('latitude', location.latitude, options);
			form.setValue('longitude', location.longitude, options);
			if (location.address) {
				form.setValue('location_address', location.address, options);
			}
			// The venue name is a suggestion, never an overwrite: the organiser may
			// have typed something more meaningful than what the geocoder returns.
			if (location.name && !form.getValues('location_name')) {
				form.setValue('location_name', location.name, options);
			}
		},
		[form],
	);

	const handleClear = useCallback(() => {
		const options = { shouldDirty: true, shouldValidate: true } as const;
		form.setValue('latitude', null, options);
		form.setValue('longitude', null, options);
	}, [form]);

	return (
		<div className="space-y-8">
			<div className="rounded-lg border bg-card p-6 shadow-sm">
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
												<Input
													{...field}
													placeholder="Rua, número, bairro, cidade e estado"
													autoComplete="off"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="mt-6">
								<h4 className="text-sm font-medium">Ponto exato no mapa</h4>
								<p className="mb-3 text-xs text-muted-foreground">
									Busque o endereço ou clique no mapa para posicionar o pino. Arraste-o para ajustar com precisão.
								</p>
								<EventLocationPicker position={position} onPick={handlePick} onClear={handleClear} />
								{form.formState.errors.latitude?.message && (
									<p className="mt-2 text-sm font-medium text-destructive">
										{form.formState.errors.latitude.message}
									</p>
								)}
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
