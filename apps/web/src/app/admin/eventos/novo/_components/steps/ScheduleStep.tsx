'use client';

import { Card } from '@/components/ui/card';
import { CalendarIcon, Clock } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { differenceInHours, addHours, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import type { EventWizardFormValues } from '../types';

export function ScheduleStep() {
	const form = useFormContext<EventWizardFormValues>();

	const startValue = useWatch({ control: form.control, name: 'start_date' });
	const endValue = useWatch({ control: form.control, name: 'end_date' });

	const startDate = startValue ? new Date(startValue) : undefined;
	const endDate = endValue ? new Date(endValue) : undefined;

	const duration = startDate && endDate ? differenceInHours(endDate, startDate) : undefined;

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
			<Card className="p-6">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Quando será o evento?</h2>
							<p className="text-sm text-muted-foreground">
								Defina quando o evento acontece e quando as inscrições abrem e encerram.
							</p>
						</div>
						<CalendarIcon className="size-5 text-primary" />
					</div>

					<div className="mt-6 space-y-6">
						{/* Bloco 1: Data e horário do evento */}
						<Card className="p-4">
							<div className="mb-4 flex items-start justify-between gap-4">
								<div>
									<h3 className="flex items-center gap-2 text-sm font-semibold">
										<CalendarIcon className="size-4 text-primary" />
										Data e horário do evento
									</h3>
									<p className="mt-1 text-xs text-muted-foreground">Defina quando seu evento acontecerá.</p>
								</div>

								{/* Presets rápidos */}
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => applyPreset('one-day')}
										className="h-7"
									>
										1 dia
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => applyPreset('weekend')}
										className="h-7"
									>
										Fim de semana
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => applyPreset('evening')}
										className="h-7"
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
													placeholder="Selecione o início do evento"
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
														<Button
															variant="outline"
															type="button"
															className="h-auto whitespace-normal px-2 py-0.5"
															onClick={() => alignEndToSuggestion(2)}
															title="Adicionar 2 horas à duração"
														>
															+2h
														</Button>
														<Button
															variant="outline"
															type="button"
															className="h-auto whitespace-normal px-2 py-0.5"
															onClick={() => alignEndToSuggestion(4)}
															title="Adicionar 4 horas à duração"
														>
															+4h
														</Button>
														<Button
															variant="outline"
															type="button"
															className="h-auto whitespace-normal px-2 py-0.5"
															onClick={() => alignEndToSuggestion(24)}
															title="Adicionar 1 dia à duração"
														>
															+1 dia
														</Button>
													</div>
												)}
											</div>
											<FormControl>
												<DateTimePicker
													date={field.value ? new Date(field.value) : undefined}
													setDate={(date) => {
														field.onChange(date ? date.toISOString() : '');
													}}
													placeholder="Selecione o término do evento"
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
						</Card>

						<p className="text-sm text-muted-foreground">
							O período de vendas é definido em cada ingresso/lote, na etapa Ingressos.
						</p>
					</div>
				</div>
			</Card>
		</div>
	);
}
