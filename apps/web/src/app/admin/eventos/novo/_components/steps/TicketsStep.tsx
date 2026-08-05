'use client';

import { useState } from 'react';
import { Sparkles, Ticket, DollarSign, Users, Info, ChevronDown, FileEdit, Globe, Ban, Archive, Rocket, Check, BadgeDollarSign } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EventWizardFormValues } from '../types';

const MAIN_STATUS_OPTIONS = [
	{
		value: 'draft' as const,
		label: 'Rascunho',
		description: 'Perfeito se você ainda estiver configurando seu evento',
		icon: FileEdit,
	},
	{
		value: 'published' as const,
		label: 'Publicado',
		description: 'Seu evento ficará visível para todos imediatamente',
		icon: Globe,
	},
] as const;

const ADVANCED_STATUS_OPTIONS = [
	{
		value: 'cancelled' as const,
		label: 'Cancelado',
		description: 'Use apenas se precisar cancelar o evento',
		icon: Ban,
	},
	{
		value: 'archived' as const,
		label: 'Arquivado',
		description: 'Mantém no histórico sem exibir publicamente',
		icon: Archive,
	},
] as const;

export function TicketsStep() {
	const form = useFormContext<EventWizardFormValues>();
	const isFree = form.watch('is_free');
	const maxAttendees = form.watch('max_attendees');
	const status = form.watch('status');
	const [hasUnlimitedCapacity, setHasUnlimitedCapacity] = useState(!maxAttendees);
	const [showAdvancedStatus, setShowAdvancedStatus] = useState(
		status === 'cancelled' || status === 'archived',
	);

	const handleCapacityToggle = (unlimited: boolean) => {
		setHasUnlimitedCapacity(unlimited);
		if (unlimited) {
			form.setValue('max_attendees', null, { shouldDirty: true, shouldValidate: true });
		}
	};

	const isPublished = status === 'published';

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Ingressos e publicação</h2>
							<p className="text-sm text-muted-foreground">
								Escolha se os participantes pagam ou entram de graça, defina vagas e como quer publicar.
							</p>
						</div>
						<Sparkles className="size-5 text-primary" />
					</div>

					<div className="mt-6 space-y-6">
						{/* Bloco 1: Tipo de ingresso */}
						<div className="rounded-lg border bg-card p-4">
							<div className="mb-4 flex items-start justify-between gap-4">
								<div>
									<h3 className="flex items-center gap-2 text-sm font-semibold">
										<Ticket className="size-4 text-primary" />
										Tipo de ingresso
									</h3>
									<p className="mt-1 text-xs text-muted-foreground">
										Defina como os participantes terão acesso ao evento.
									</p>
								</div>
								<TooltipProvider delayDuration={200}>
									<Tooltip>
										<TooltipTrigger asChild>
											<button type="button" className="text-muted-foreground hover:text-foreground">
												<Info className="size-4" />
											</button>
										</TooltipTrigger>
										<TooltipContent side="left" className="max-w-[280px]">
											<p className="text-xs">
												Você poderá alterar isso antes de publicar. Se escolher evento pago, configurará preços e lotes na
												próxima etapa.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<button
									type="button"
									onClick={() => form.setValue('is_free', true, { shouldDirty: true, shouldValidate: true })}
									className={cn(
										'group relative flex flex-col gap-3 rounded-lg border-2 p-4 text-left transition-all',
										isFree
											? 'border-primary bg-primary/5 shadow-sm'
											: 'border-border hover:border-primary/40 hover:bg-muted/50',
									)}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div
												className={cn(
													'flex size-10 items-center justify-center rounded-lg transition-all',
													isFree ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
												)}
											>
												<Ticket className="size-5" />
											</div>
											<div>
												<p className="text-sm font-semibold">Evento gratuito</p>
												<p className="flex items-center gap-1 text-xs text-emerald-600">
													<Check className="size-3" />
													Inscrição simples e rápida
												</p>
											</div>
										</div>
										{isFree && (
											<div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
												<Check className="size-3" />
											</div>
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										Os participantes garantem presença sem custo. Você pode solicitar inscrição prévia para controlar vagas.
									</p>
								</button>

								<button
									type="button"
									onClick={() => form.setValue('is_free', false, { shouldDirty: true, shouldValidate: true })}
									className={cn(
										'group relative flex flex-col gap-3 rounded-lg border-2 p-4 text-left transition-all',
										!isFree
											? 'border-primary bg-primary/5 shadow-sm'
											: 'border-border hover:border-primary/40 hover:bg-muted/50',
									)}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div
												className={cn(
													'flex size-10 items-center justify-center rounded-lg transition-all',
													!isFree ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
												)}
											>
												<DollarSign className="size-5" />
											</div>
											<div>
												<p className="text-sm font-semibold">Evento pago</p>
												<p className="flex items-center gap-1 text-xs text-primary">
													<BadgeDollarSign className="size-3" />
													Configure preços e receba com segurança
												</p>
											</div>
										</div>
										{!isFree && (
											<div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
												<Check className="size-3" />
											</div>
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										Defina lotes de ingressos e preços após salvar. Mostraremos uma calculadora de receita estimada.
									</p>
								</button>
							</div>
						</div>

						{/* Bloco 2: Capacidade */}
						<div className="rounded-lg border bg-card p-4">
							<div className="mb-4">
								<h3 className="flex items-center gap-2 text-sm font-semibold">
									<Users className="size-4 text-primary" />
									Capacidade do evento
								</h3>
								<p className="mt-1 text-xs text-muted-foreground">
									Defina quantas pessoas podem participar do evento.
								</p>
							</div>

							<div className="space-y-4">
								<div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
									<div>
										<p className="text-sm font-medium">Vagas ilimitadas</p>
										<p className="text-xs text-muted-foreground">
											Qualquer número de pessoas poderá participar
										</p>
									</div>
									<Switch checked={hasUnlimitedCapacity} onCheckedChange={handleCapacityToggle} />
								</div>

								{!hasUnlimitedCapacity && (
									<FormField
										control={form.control}
										name="max_attendees"
										render={({ field }) => (
											<FormItem className="animate-in fade-in-50 duration-200">
												<FormLabel>Número máximo de participantes</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={1}
														placeholder="Ex: 150 pessoas"
														value={field.value ?? ''}
														onChange={(event) => {
															const value = event.target.value;
															field.onChange(value ? Number(value) : null);
														}}
													/>
												</FormControl>
												<FormMessage />
												{maxAttendees && (
													<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<Users className="size-3" />
														Os participantes verão &quot;{maxAttendees} lugares disponíveis&quot;
													</p>
												)}
											</FormItem>
										)}
									/>
								)}
							</div>
						</div>

						{/* Bloco 3: Status inicial */}
						<div className="rounded-lg border border-dashed p-4">
							<div className="mb-4">
								<h3 className="text-sm font-semibold">Status inicial</h3>
								<p className="text-xs text-muted-foreground">
									Você pode salvar como rascunho para continuar depois ou publicar imediatamente.
								</p>
							</div>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem className="space-y-3">
										<FormControl>
											<RadioGroup
												value={field.value}
												onValueChange={(value) => field.onChange(value as EventWizardFormValues['status'])}
												className="grid gap-3 sm:grid-cols-2"
											>
												{MAIN_STATUS_OPTIONS.map((option) => {
													const Icon = option.icon;

													return (
														<label
															key={option.value}
															className={cn(
																'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all',
																field.value === option.value
																	? 'border-primary bg-primary/5'
																	: 'border-border hover:border-primary/40 hover:bg-muted/50',
															)}
														>
															<RadioGroupItem value={option.value} className="mt-0.5" />
															<div className="flex-1">
																<div className="flex items-center gap-2">
																	<Icon className="size-4 text-primary" />
																	<p className="text-sm font-semibold">{option.label}</p>
																</div>
																<p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
															</div>
														</label>
													);
												})}
											</RadioGroup>
										</FormControl>
										<FormMessage />

										{/* Opções avançadas (colapsável) */}
										<div className="rounded-lg border">
											<button
												type="button"
												onClick={() => setShowAdvancedStatus(!showAdvancedStatus)}
												className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/50"
											>
												<span className="text-xs font-medium text-muted-foreground">
													Outras opções (avançado)
												</span>
												<ChevronDown
													className={cn(
														'size-3 text-muted-foreground transition-transform',
														showAdvancedStatus && 'rotate-180',
													)}
												/>
											</button>

											{showAdvancedStatus && (
												<div className="border-t p-3">
													<RadioGroup
														value={field.value}
														onValueChange={(value) => field.onChange(value as EventWizardFormValues['status'])}
														className="grid gap-3"
													>
														{ADVANCED_STATUS_OPTIONS.map((option) => {
															const Icon = option.icon;

															return (
																<label
																	key={option.value}
																	className={cn(
																		'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all',
																		field.value === option.value
																			? 'border-primary bg-primary/5'
																			: 'border-border hover:border-primary/40 hover:bg-muted/50',
																	)}
																>
																	<RadioGroupItem value={option.value} className="mt-0.5" />
																	<div className="flex-1">
																		<div className="flex items-center gap-2">
																			<Icon className="size-4 text-muted-foreground" />
																			<p className="text-sm font-medium">{option.label}</p>
																		</div>
																		<p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
																	</div>
																</label>
															);
														})}
													</RadioGroup>
												</div>
											)}
										</div>
									</FormItem>
								)}
							/>
						</div>

						{/* Bloco 4: Opções avançadas (apenas se publicado) */}
						{isPublished && (
							<div className="animate-in fade-in-50 slide-in-from-top-2 rounded-lg border bg-primary/5 p-4 duration-200">
								<div className="mb-4 flex items-start gap-2">
									<Sparkles className="mt-0.5 size-4 text-primary" />
									<div>
										<h3 className="text-sm font-semibold">Opções de destaque</h3>
										<p className="text-xs text-muted-foreground">
											Aumente a visibilidade do seu evento publicado.
										</p>
									</div>
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									<FormField
										control={form.control}
										name="featured"
										render={({ field }) => (
											<FormItem className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3">
												<div className="flex items-start justify-between gap-3">
													<div className="flex-1">
														<FormLabel className="flex items-center gap-1.5 text-sm font-medium">
															<Sparkles className="size-3.5" />
															Destacar na homepage
														</FormLabel>
														<p className="mt-1 text-xs text-muted-foreground">
															Seu evento aparece em destaque para mais pessoas
														</p>
														<p className="mt-1 text-[10px] font-medium text-primary">+ visibilidade</p>
													</div>
													<FormControl>
														<Switch checked={field.value} onCheckedChange={field.onChange} />
													</FormControl>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="publish_after_create"
										render={({ field }) => (
											<FormItem className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3">
												<div className="flex items-start justify-between gap-3">
													<div className="flex-1">
														<FormLabel className="flex items-center gap-1.5 text-sm font-medium">
															<Rocket className="size-3.5" />
															Publicar automaticamente
														</FormLabel>
														<p className="mt-1 text-xs text-muted-foreground">
															O evento será exibido assim que estiver completo
														</p>
														<p className="mt-1 text-[10px] font-medium text-emerald-600">Requer status Publicado</p>
													</div>
													<FormControl>
														<Switch checked={field.value} onCheckedChange={field.onChange} />
													</FormControl>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
