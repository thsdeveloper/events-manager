'use client';

import { useState } from 'react';
import { CalendarIcon, Clock, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { differenceInHours, addHours, isBefore, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EventWizardFormValues } from '../types';

export function ScheduleStep() {
	const form = useFormContext<EventWizardFormValues>();
	const [showRegistrationPeriod, setShowRegistrationPeriod] = useState(false);

	const startValue = form.watch('start_date');
	const endValue = form.watch('end_date');
	const registrationStartValue = form.watch('registration_start');
	const registrationEndValue = form.watch('registration_end');

	const startDate = startValue ? new Date(startValue) : undefined;
	const endDate = endValue ? new Date(endValue) : undefined;
	const registrationStart = registrationStartValue ? new Date(registrationStartValue) : undefined;
	const registrationEnd = registrationEndValue ? new Date(registrationEndValue) : undefined;

	const duration = startDate && endDate ? differenceInHours(endDate, startDate) : undefined;

	// Validações em tempo real
	const hasRegistrationError = registrationEnd && startDate && isAfter(registrationEnd, startDate);
	const isRegistrationValid = registrationStart && registrationEnd && !hasRegistrationError;

	const alignEndToSuggestion = (hours: number) => {
		if (!startDate) return;
		const targetDate = addHours(startDate, hours);
		form.setValue('end_date', targetDate.toISOString(), { shouldDirty: true, shouldValidate: true });
	};

	const applyPreset = (preset: 'one-day' | 'weekend' | 'evening') => {
		const now = new Date();

		switch (preset) {
			case 'one-day': {
				const start = new Date(now);
				start.setHours(9, 0, 0, 0);
				const end = new Date(start);
				end.setHours(18, 0, 0, 0);
				form.setValue('start_date', start.toISOString(), { shouldDirty: true, shouldValidate: true });
				form.setValue('end_date', end.toISOString(), { shouldDirty: true, shouldValidate: true });
				break;
			}
			case 'weekend': {
				const start = new Date(now);
				const daysUntilSaturday = (6 - start.getDay() + 7) % 7;
				start.setDate(start.getDate() + daysUntilSaturday);
				start.setHours(10, 0, 0, 0);
				const end = new Date(start);
				end.setDate(end.getDate() + 1);
				end.setHours(18, 0, 0, 0);
				form.setValue('start_date', start.toISOString(), { shouldDirty: true, shouldValidate: true });
				form.setValue('end_date', end.toISOString(), { shouldDirty: true, shouldValidate: true });
				break;
			}
			case 'evening': {
				const start = new Date(now);
				start.setHours(19, 0, 0, 0);
				const end = new Date(start);
				end.setHours(22, 0, 0, 0);
				form.setValue('start_date', start.toISOString(), { shouldDirty: true, shouldValidate: true });
				form.setValue('end_date', end.toISOString(), { shouldDirty: true, shouldValidate: true });
				break;
			}
		}
	};

	return (
		<div className="space-y-8">
			<div className="rounded-lg border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Agenda e inscrições</h2>
							<p className="text-sm text-muted-foreground">
								Defina quando o evento acontece e quando as inscrições abrem e encerram.
							</p>
						</div>
						<CalendarIcon className="size-5 text-primary" />
					</div>

					<div className="mt-6 space-y-6">
						{/* Bloco 1: Data e horário do evento */}
						<div className="rounded-lg border bg-card p-4">
							<div className="mb-4 flex items-start justify-between gap-4">
								<div>
									<h3 className="flex items-center gap-2 text-sm font-semibold">
										<CalendarIcon className="size-4 text-primary" />
										Data e horário do evento
									</h3>
									<p className="mt-1 text-xs text-muted-foreground">
										Defina quando seu evento acontecerá.
									</p>
								</div>

								{/* Presets rápidos */}
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => applyPreset('one-day')}
										className="h-7 text-xs"
									>
										1 dia
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => applyPreset('weekend')}
										className="h-7 text-xs"
									>
										Fim de semana
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => applyPreset('evening')}
										className="h-7 text-xs"
									>
										Noturno
									</Button>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="start_date"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Início do evento</FormLabel>
											<FormControl>
												<DateTimePicker
													date={field.value ? new Date(field.value) : undefined}
													setDate={(date) => {
														field.onChange(date ? date.toISOString() : '');
													}}
													placeholder="Ex: 20 de outubro de 2025 — 09:00"
													minDate={new Date()}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="end_date"
									render={({ field }) => (
										<FormItem>
											<div className="flex items-center justify-between">
												<FormLabel>Término do evento</FormLabel>
												{startDate && (
													<div className="flex gap-1.5">
														<button
															type="button"
															className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
															onClick={() => alignEndToSuggestion(2)}
															title="Adicionar 2 horas à duração"
														>
															+2h
														</button>
														<button
															type="button"
															className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
															onClick={() => alignEndToSuggestion(4)}
															title="Adicionar 4 horas à duração"
														>
															+4h
														</button>
														<button
															type="button"
															className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
															onClick={() => alignEndToSuggestion(24)}
															title="Adicionar 1 dia à duração"
														>
															+1 dia
														</button>
													</div>
												)}
											</div>
											<FormControl>
												<DateTimePicker
													date={field.value ? new Date(field.value) : undefined}
													setDate={(date) => {
														field.onChange(date ? date.toISOString() : '');
													}}
													placeholder="Ex: 20 de outubro de 2025 — 18:00"
													minDate={startDate}
												/>
											</FormControl>
											<FormMessage />
											{duration !== undefined && duration >= 0 && (
												<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
													<Clock className="size-3" />
													Duração estimada: {duration === 0 ? 'menos de 1 hora' : `${duration} hora(s)`}
												</p>
											)}
										</FormItem>
									)}
								/>
							</div>

							{/* Linha do tempo visual */}
							{startDate && endDate && (
								<div className="mt-4 rounded-md bg-muted/50 p-3">
									<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Linha do tempo
									</p>
									<div className="relative">
										<div className="flex items-center justify-between text-xs">
											<div className="flex flex-col items-start">
												<span className="font-medium text-foreground">Início</span>
												<span className="text-muted-foreground">
													{format(startDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
												</span>
											</div>
											<div className="flex-1 px-4">
												<div className="relative h-2 overflow-hidden rounded-full bg-primary/20">
													<div className="absolute inset-y-0 left-0 w-full rounded-full bg-primary/40" />
												</div>
											</div>
											<div className="flex flex-col items-end">
												<span className="font-medium text-foreground">Término</span>
												<span className="text-muted-foreground">
													{format(endDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
												</span>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Bloco 2: Período de inscrições (Progressive Disclosure) */}
						<div className="rounded-lg border border-dashed">
							<button
								type="button"
								onClick={() => setShowRegistrationPeriod(!showRegistrationPeriod)}
								className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
							>
								<div className="flex items-center gap-2">
									<Clock className="size-4 text-primary" />
									<div>
										<p className="text-sm font-medium">Período de inscrições (opcional)</p>
										<p className="text-xs text-muted-foreground">
											{showRegistrationPeriod
												? 'Escolha quando as inscrições estarão abertas'
												: 'Defina quando o público pode garantir presença'}
										</p>
									</div>
								</div>
								<ChevronDown
									className={cn(
										'size-4 text-muted-foreground transition-transform',
										showRegistrationPeriod && 'rotate-180',
									)}
								/>
							</button>

							{showRegistrationPeriod && (
								<div className="border-t p-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<FormField
											control={form.control}
											name="registration_start"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Abertura das inscrições</FormLabel>
													<FormControl>
														<DateTimePicker
															date={field.value ? new Date(field.value) : undefined}
															setDate={(date) => {
																field.onChange(date ? date.toISOString() : '');
															}}
															placeholder="Escolha quando as inscrições abrem"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="registration_end"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Encerramento das inscrições</FormLabel>
													<FormControl>
														<DateTimePicker
															date={field.value ? new Date(field.value) : undefined}
															setDate={(date) => {
																field.onChange(date ? date.toISOString() : '');
															}}
															placeholder="Escolha até quando ficam disponíveis"
															minDate={registrationStart}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									{/* Validação em tempo real */}
									{hasRegistrationError && (
										<div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
											<AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
											<div>
												<p className="font-medium text-destructive">Data inválida</p>
												<p className="text-xs text-destructive/80">
													O encerramento das inscrições não pode ser depois do início do evento.
												</p>
											</div>
										</div>
									)}

									{isRegistrationValid && (
										<div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm">
											<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
											<div>
												<p className="font-medium text-emerald-600">Período de inscrições válido</p>
												<p className="text-xs text-emerald-600/80">
													As inscrições ficam abertas por{' '}
													{differenceInHours(registrationEnd, registrationStart)} hora(s).
												</p>
											</div>
										</div>
									)}

									{/* Linha do tempo de inscrições */}
									{registrationStart && registrationEnd && !hasRegistrationError && (
										<div className="mt-4 rounded-md bg-muted/50 p-3">
											<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
												Período de inscrições
											</p>
											<div className="relative">
												<div className="flex items-center justify-between text-xs">
													<div className="flex flex-col items-start">
														<span className="font-medium text-foreground">Abertura</span>
														<span className="text-muted-foreground">
															{format(registrationStart, "dd/MM 'às' HH:mm", { locale: ptBR })}
														</span>
													</div>
													<div className="flex-1 px-4">
														<div className="relative h-2 overflow-hidden rounded-full bg-emerald-500/20">
															<div className="absolute inset-y-0 left-0 w-full rounded-full bg-emerald-500/40" />
														</div>
													</div>
													<div className="flex flex-col items-end">
														<span className="font-medium text-foreground">Encerramento</span>
														<span className="text-muted-foreground">
															{format(registrationEnd, "dd/MM 'às' HH:mm", { locale: ptBR })}
														</span>
													</div>
												</div>
											</div>
										</div>
									)}

									<p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
										💡 Se deixar em branco, as inscrições ficarão abertas até o início do evento.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
