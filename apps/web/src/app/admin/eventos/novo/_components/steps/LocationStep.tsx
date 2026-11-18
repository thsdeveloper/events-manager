'use client';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BRAZILIAN_STATES } from '@events-manager/contracts';
import { useFormContext, useWatch } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EventLocationDialog } from '@/components/map/EventLocationDialog';
import { usePostalCode, type PostalAddress } from '@/components/location/usePostalCode';
import { structuredAddress } from '../wizard-content';
import type { EventWizardFormValues } from '../types';
const formats = [
	['in_person', 'Presencial', 'Encontre seu público em um espaço físico.', 'event-in-person'],
	['online', 'Online', 'Conecte participantes de qualquer lugar.', 'event-online'],
	['hybrid', 'Híbrido', 'Una a experiência presencial e online.', 'event-hybrid'],
] as const;
const platforms = [
	['custom', 'Outro link'],
	['youtube', 'YouTube'],
	['zoom', 'Zoom'],
	['google_meet', 'Google Meet'],
	['microsoft_teams', 'Microsoft Teams'],
	['vimeo', 'Vimeo'],
] as const;
const addressFields = [
	['location_street', 'Rua ou avenida', 'address-line1'],
	['location_number', 'Número', 'off'],
	['location_complement', 'Complemento', 'address-line2'],
	['location_neighborhood', 'Bairro', 'off'],
	['location_city', 'Cidade', 'address-level2'],
] as const;
export function LocationStep() {
	const form = useFormContext<EventWizardFormValues>();
	const type = useWatch({ control: form.control, name: 'event_type' });
	const undefinedVenue = useWatch({ control: form.control, name: 'location_tbd' });
	const showMap = useWatch({ control: form.control, name: 'show_map' }) !== false;
	const latitude = useWatch({ control: form.control, name: 'latitude' }),
		longitude = useWatch({ control: form.control, name: 'longitude' });
	const postalCode = useWatch({ control: form.control, name: 'location_postal_code' }) ?? '';
	const [lookupEnabled, setLookupEnabled] = useState(
		() => !form.getValues('location_street') && !form.getValues('location_city'),
	);
	const addressValues = useWatch({ control: form.control });
	const position = typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null;
	const applyAddress = useCallback(
		(address: PostalAddress) => {
			if (form.getValues('location_postal_code')?.replace(/\D/g, '') !== address.postal_code) return;
			const options = { shouldDirty: true, shouldValidate: true };
			form.setValue('location_street', address.street, options);
			form.setValue('location_neighborhood', address.neighborhood, options);
			form.setValue('location_city', address.city, options);
			form.setValue('location_state', address.state, options);
		},
		[form],
	);
	const postal = usePostalCode(postalCode, lookupEnabled && type !== 'online' && !undefinedVenue, applyAddress);

	return (
		<Card className="space-y-7 p-5 sm:p-6">
			<div>
				<h2 className="text-xl font-semibold">Formato e localização</h2>
				<p className="text-sm text-muted-foreground">Informe como os participantes terão acesso ao evento.</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Formato do evento">
				{formats.map(([value, label, description, image]) => (
					<Button
						key={value}
						type="button"
						variant="outline"
						aria-label={label}
						aria-pressed={type === value}
						onClick={() => form.setValue('event_type', value, { shouldDirty: true, shouldValidate: true })}
						className="relative h-auto flex-col items-start gap-3 whitespace-normal rounded-xl p-5 text-left aria-pressed:border-[#743DF5] aria-pressed:bg-[#F3EEFF] aria-pressed:text-[#231A33]"
					>
						<Image
							src={`/illustrations/event-creation/${image}.png`}
							width={96}
							height={96}
							alt=""
							className="size-24 object-contain"
						/>
						{type === value && (
							<CheckCircle2 aria-hidden="true" className="absolute right-4 top-4 size-5 text-[#743DF5]" />
						)}
						<span className="text-base font-semibold">{label}</span>
						<span className="text-xs font-normal leading-5 opacity-75">{description}</span>
					</Button>
				))}
			</div>
			{type !== 'online' && (
				<Card className="space-y-5 p-4 sm:p-5">
					<h3 className="font-semibold">Local do evento</h3>
					<FormField
						control={form.control}
						name="location_tbd"
						render={({ field }) => (
							<FormItem className="flex flex-wrap items-center gap-3 space-y-0">
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
							<div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
								<FormField
									control={form.control}
									name="location_name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nome do local *</FormLabel>
											<FormControl>
												<Input {...field} aria-required value={field.value ?? ''} placeholder="Ex: Teatro Municipal" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="location_postal_code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>CEP *</FormLabel>
											<FormControl>
												<Input
													{...field}
													aria-required
													value={(field.value ?? '')
														.replace(/\D/g, '')
														.slice(0, 8)
														.replace(/^(\d{5})(\d)/, '$1-$2')}
													onChange={(event) => {
														setLookupEnabled(true);
														field.onChange(
															event.target.value
																.replace(/\D/g, '')
																.slice(0, 8)
																.replace(/^(\d{5})(\d)/, '$1-$2'),
														);
													}}
													inputMode="numeric"
													autoComplete="postal-code"
													placeholder="00000-000"
													maxLength={9}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<p className="text-xs text-muted-foreground" role="status">
								{postal.loading
									? 'Buscando endereço pelo CEP…'
									: 'Informe o CEP para preencher o endereço. Você pode ajustar os campos abaixo.'}
							</p>
							{postal.error && (
								<p role="alert" className="text-sm text-destructive">
									{postal.error}
								</p>
							)}
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{addressFields.map(([name, label, autoComplete]) => (
									<FormField
										key={name}
										control={form.control}
										name={name}
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{label}
													{name === 'location_number' ? ' *' : ''}
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														value={field.value ?? ''}
														autoComplete={autoComplete}
														aria-required={name === 'location_number'}
														placeholder={name === 'location_number' ? 'Número ou s/n' : undefined}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								))}
								<FormField
									control={form.control}
									name="location_state"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Estado *</FormLabel>
											<Select value={field.value ?? ''} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required>
														<SelectValue placeholder="Selecione o estado" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{BRAZILIAN_STATES.map(([uf, name]) => (
														<SelectItem key={uf} value={uf}>
															{name} - {uf}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="show_map"
								render={({ field }) => (
									<FormItem className="flex flex-wrap items-center gap-3 space-y-0">
										<FormLabel>Mostrar mapa na página do evento</FormLabel>
										<FormControl>
											<Switch checked={field.value !== false} onCheckedChange={field.onChange} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{showMap && (
								<>
									<EventLocationDialog
										position={position}
										address={
											structuredAddress(addressValues) ||
											addressValues.location_address ||
											addressValues.location_name ||
											''
										}
										onSave={(next) => {
											form.setValue('latitude', next?.latitude ?? null, { shouldDirty: true, shouldValidate: true });
											form.setValue('longitude', next?.longitude ?? null, { shouldDirty: true, shouldValidate: true });
										}}
									/>
									{form.formState.errors.latitude?.message && (
										<p className="text-sm text-destructive">{form.formState.errors.latitude.message}</p>
									)}
								</>
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
