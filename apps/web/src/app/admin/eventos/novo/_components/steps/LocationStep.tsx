'use client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EventLocationPicker, type PickedLocation } from '@/components/map/EventLocationPicker';

import type { EventWizardFormValues } from '../types';

const formats = [
	['in_person', 'Presencial'],
	['online', 'Online'],
	['hybrid', 'Híbrido'],
] as const;
const addressFields = [
	['location_street', 'Rua ou avenida', 'address-line1'],
	['location_number', 'Número', 'off'],
	['location_complement', 'Complemento', 'address-line2'],
	['location_neighborhood', 'Bairro', 'off'],
	['location_city', 'Cidade', 'address-level2'],
	['location_state', 'Estado', 'address-level1'],
	['location_postal_code', 'CEP', 'postal-code'],
] as const;
const platforms = [
	['custom', 'Outro link'],
	['youtube', 'YouTube'],
	['zoom', 'Zoom'],
	['google_meet', 'Google Meet'],
	['microsoft_teams', 'Microsoft Teams'],
	['vimeo', 'Vimeo'],
] as const;

export function LocationStep() {
	const form = useFormContext<EventWizardFormValues>();
	const type = useWatch({ control: form.control, name: 'event_type' });
	const undefinedVenue = useWatch({ control: form.control, name: 'location_tbd' });
	const showMap = useWatch({ control: form.control, name: 'show_map' }) !== false;
	const latitude = useWatch({ control: form.control, name: 'latitude' }),
		longitude = useWatch({ control: form.control, name: 'longitude' });
	const position = typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null;
	const pick = useCallback(
		(location: PickedLocation) => {
			const options = { shouldDirty: true, shouldValidate: true };
			form.setValue('latitude', location.latitude, options);
			form.setValue('longitude', location.longitude, options);
			if (location.address) form.setValue('location_address', location.address, options);
			if (location.name && !form.getValues('location_name')) form.setValue('location_name', location.name, options);
		},
		[form],
	);
	const clear = useCallback(() => {
		form.setValue('latitude', null, { shouldDirty: true });
		form.setValue('longitude', null, { shouldDirty: true });
	}, [form]);

	return (
		<Card className="space-y-8 p-6">
			<div>
				<h2 className="text-xl font-semibold">Formato e localização</h2>
				<p className="text-sm text-muted-foreground">Informe como os participantes terão acesso ao evento.</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Formato do evento">
				{formats.map(([value, label]) => (
					<Button
						variant={type === value ? 'secondary' : 'outline'}
						key={value}
						type="button"
						aria-pressed={type === value}
						onClick={() => form.setValue('event_type', value, { shouldDirty: true, shouldValidate: true })}
						className="h-auto justify-start py-4"
					>
						{label}
					</Button>
				))}
			</div>
			{type !== 'online' && (
				<Card className="space-y-5 p-4">
					<h3 className="font-semibold">Local do evento</h3>
					<FormField
						control={form.control}
						name="location_tbd"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between gap-3">
								<FormLabel>Local ainda a definir</FormLabel>
								<FormControl>
									<Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{undefinedVenue ? (
						<p className="text-sm text-muted-foreground">
							A página mostrará “Local a definir”. Você poderá preencher o endereço depois.
						</p>
					) : (
						<>
							<div className="grid gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="location_name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nome do local</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ''} placeholder="Ex: Teatro Municipal" />
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
													value={field.value ?? ''}
													placeholder="Rua, número, bairro, cidade e estado"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<fieldset className="grid gap-4 sm:grid-cols-2">
								<legend className="mb-3 text-sm font-medium">Detalhes do endereço (opcional)</legend>
								{addressFields.map(([name, label, autoComplete]) => (
									<FormField
										key={name}
										control={form.control}
										name={name}
										render={({ field }) => (
											<FormItem>
												<FormLabel>{label}</FormLabel>
												<FormControl>
													<Input {...field} value={field.value ?? ''} autoComplete={autoComplete} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								))}
							</fieldset>
							<FormField
								control={form.control}
								name="show_map"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between gap-3">
										<FormLabel>Mostrar mapa na página do evento</FormLabel>
										<FormControl>
											<Switch checked={field.value !== false} onCheckedChange={field.onChange} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{showMap && (
								<div>
									<p className="mb-3 text-sm text-muted-foreground">
										Busque o endereço ou marque o ponto exato no mapa.
									</p>
									<EventLocationPicker position={position} onPick={pick} onClear={clear} />
									{form.formState.errors.latitude?.message && (
										<p className="text-sm text-destructive">{form.formState.errors.latitude.message}</p>
									)}
								</div>
							)}
						</>
					)}
				</Card>
			)}
			{type !== 'in_person' && (
				<Card className="space-y-4 p-4">
					<h3 className="font-semibold">Transmissão online</h3>
					<p className="text-sm text-muted-foreground">O link de acesso é entregue aos participantes confirmados.</p>
					<FormField
						control={form.control}
						name="online_platform"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Plataforma</FormLabel>
								<Select value={field.value ?? 'custom'} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger ref={field.ref} onBlur={field.onBlur}>
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{platforms.map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="online_url"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Link de acesso</FormLabel>
								<FormControl>
									<Input {...field} value={field.value ?? ''} type="url" placeholder="https://..." />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</Card>
			)}
		</Card>
	);
}
