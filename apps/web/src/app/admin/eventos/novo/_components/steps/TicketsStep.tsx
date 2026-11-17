'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
	Sparkles,
	Ticket,
	DollarSign,
	Users,
	Info,
	ChevronDown,
	FileEdit,
	Globe,
	Ban,
	Archive,
	Check,
	BadgeDollarSign,
} from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TicketGroupingEditor } from '@/features/tickets/components/TicketGroupingEditor';
import { TicketFormSheet } from '@/features/tickets/components/TicketFormSheet';
import { TicketList } from '@/features/tickets/components/TicketList';
import { ticketKey, type TicketDraft } from '@/features/tickets/types';
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
		description: 'A página do evento ficará disponível após salvar',
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

interface TicketsStepProps {
	/**
	 * Na edição, os tipos de ingresso já existem no banco e têm vendas: são
	 * geridos na página do evento, não aqui. Recebe o link para lá.
	 */
	manageTicketsHref?: string;
	draftOnly?: boolean;
}

export function TicketsStep({ manageTicketsHref, draftOnly = false }: TicketsStepProps = {}) {
	const form = useFormContext<EventWizardFormValues>();
	const isFree = useWatch({ control: form.control, name: 'is_free' });
	const maxAttendees = useWatch({ control: form.control, name: 'max_attendees' });
	const status = useWatch({ control: form.control, name: 'status' });
	const [hasUnlimitedCapacity, setHasUnlimitedCapacity] = useState(!maxAttendees);
	const [showAdvancedStatus, setShowAdvancedStatus] = useState(status === 'cancelled' || status === 'archived');

	// Tickets live in the wizard form because the event has no id yet — they are
	// sent together with it and persisted by the API in one atomic call.
	const tickets = useWatch({ control: form.control, name: 'tickets' }) ?? [];
	const groups = useWatch({ control: form.control, name: 'ticket_groups' }) ?? [];
	const sheetGroups = groups.map((group) => ({
		id: group.client_id,
		title: group.title,
		parent_id: group.parent_client_id ?? null,
	}));
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editingTicket, setEditingTicket] = useState<TicketDraft | null>(null);

	const writeTickets = useCallback(
		(next: TicketDraft[]) => form.setValue('tickets', next, { shouldDirty: true, shouldValidate: true }),
		[form],
	);

	const handleAddTicket = useCallback(() => {
		setEditingTicket(null);
		setSheetOpen(true);
	}, []);

	const handleEditTicket = useCallback((ticket: TicketDraft) => {
		setEditingTicket(ticket);
		setSheetOpen(true);
	}, []);

	const handleRemoveTicket = useCallback(
		(ticket: TicketDraft) => writeTickets(tickets.filter((item) => ticketKey(item) !== ticketKey(ticket))),
		[tickets, writeTickets],
	);

	const handleTicketSaved = useCallback(
		(saved: TicketDraft) => {
			const exists = tickets.some((item) => ticketKey(item) === ticketKey(saved));
			writeTickets(
				exists ? tickets.map((item) => (ticketKey(item) === ticketKey(saved) ? saved : item)) : [...tickets, saved],
			);
			setEditingTicket(null);
		},
		[tickets, writeTickets],
	);

	const handleCapacityToggle = (unlimited: boolean) => {
		setHasUnlimitedCapacity(unlimited);
		if (unlimited) {
			form.setValue('max_attendees', null, { shouldDirty: true, shouldValidate: true });
		}
	};

	const isPublished = status === 'published';
	const isUnlisted = useWatch({ control: form.control, name: 'visibility' }) === 'unlisted';

	return (
		<div className="space-y-8">
			<Card className="p-6">
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
						<Card className="p-4">
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
											<Button variant="ghost" type="button" className="h-auto whitespace-normal">
												<Info className="size-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent side="left" className="max-w-[280px]">
											<p className="text-xs">
												Você poderá alterar isso antes de publicar. Se escolher evento pago, configurará preços e lotes
												nesta etapa.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<Button
									variant={isFree ? 'secondary' : 'outline'}
									aria-pressed={isFree}
									type="button"
									onClick={() => form.setValue('is_free', true, { shouldDirty: true, shouldValidate: true })}
									className="h-auto flex-col items-stretch gap-3 whitespace-normal p-4 text-left"
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
												<p className="flex items-center gap-1 text-xs text-muted-foreground">
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
										Os participantes garantem presença sem custo. Você pode solicitar inscrição prévia para controlar
										vagas.
									</p>
								</Button>

								<Button
									variant={!isFree ? 'secondary' : 'outline'}
									aria-pressed={!isFree}
									type="button"
									onClick={() => form.setValue('is_free', false, { shouldDirty: true, shouldValidate: true })}
									className="h-auto flex-col items-stretch gap-3 whitespace-normal p-4 text-left"
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
										Defina os tipos de ingresso abaixo. Mostramos quanto o comprador paga e quanto você recebe.
									</p>
								</Button>
							</div>
						</Card>

						{/* Bloco: tipos de ingresso */}
						<Card className="p-4">
							<div className="mb-4 flex items-start justify-between gap-4">
								<div>
									<h3 className="flex items-center gap-2 text-sm font-semibold">
										<Ticket className="size-4 text-primary" />
										Tipos de ingresso
										{!isFree && <span className="text-destructive">*</span>}
									</h3>
									<p className="mt-1 text-xs text-muted-foreground">
										{isFree
											? 'Opcional em eventos gratuitos. Use para separar categorias de inscrição.'
											: 'Um evento pago precisa de pelo menos um tipo de ingresso.'}
									</p>
								</div>
							</div>

							{!manageTicketsHref && (
								<TicketGroupingEditor
									groups={groups}
									onChange={(next) => {
										form.setValue('ticket_groups', next, { shouldDirty: true, shouldValidate: true });
										const ids = new Set(next.map((group) => group.client_id));
										writeTickets(
											tickets.map((ticket) =>
												ticket.group_id && !ids.has(ticket.group_id) ? { ...ticket, group_id: null } : ticket,
											),
										);
									}}
								/>
							)}
							{manageTicketsHref ? (
								<div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm">
									<p className="text-foreground">
										{tickets.length === 0
											? 'Este evento ainda não tem tipos de ingresso.'
											: `${tickets.length} ${tickets.length === 1 ? 'tipo de ingresso cadastrado' : 'tipos de ingresso cadastrados'}: ${tickets.map((ticket) => ticket.title).join(', ')}.`}
									</p>
									<p className="mt-1 text-muted-foreground">
										Preços, lotes e estoque são gerenciados na página do evento, para não mexer em ingressos já vendidos
										por engano.
									</p>
									<Link
										href={manageTicketsHref}
										className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
									>
										Gerenciar ingressos
									</Link>
								</div>
							) : (
								<TicketList
									tickets={tickets}
									isFree={isFree}
									onAdd={handleAddTicket}
									onEdit={handleEditTicket}
									onRemove={handleRemoveTicket}
									onReorder={writeTickets}
									groups={sheetGroups}
									emptyHint={
										isFree ? 'Sem ingressos, a inscrição gratuita é liberada direto na página do evento.' : undefined
									}
								/>
							)}

							{form.formState.errors.tickets?.message && (
								<p className="mt-2 text-sm font-medium text-destructive">{form.formState.errors.tickets.message}</p>
							)}
						</Card>

						{/* Bloco 2: Capacidade */}
						<Card className="p-4">
							<div className="mb-4">
								<h3 className="flex items-center gap-2 text-sm font-semibold">
									<Users className="size-4 text-primary" />
									Capacidade do evento
								</h3>
								<p className="mt-1 text-xs text-muted-foreground">Defina quantas pessoas podem participar do evento.</p>
							</div>

							<div className="space-y-4">
								<Card className="flex items-center justify-between p-3">
									<div>
										<p className="text-sm font-medium">Vagas ilimitadas</p>
										<p className="text-xs text-muted-foreground">Qualquer número de pessoas poderá participar</p>
									</div>
									<Switch checked={hasUnlimitedCapacity} onCheckedChange={handleCapacityToggle} />
								</Card>

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
						</Card>

						<FormField
							control={form.control}
							name="visibility"
							render={({ field }) => (
								<FormItem className="rounded-lg border p-4 space-y-3">
									<FormLabel>Visibilidade do evento</FormLabel>
									<FormControl>
										<RadioGroup
											value={field.value ?? 'public'}
											onValueChange={field.onChange}
											className="grid gap-3 sm:grid-cols-2"
										>
											<Label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
												<RadioGroupItem value="public" />
												<span>
													<span className="block font-medium">Público</span>
													<span className="text-xs text-muted-foreground">
														Aparece no catálogo e nas buscas após a publicação.
													</span>
												</span>
											</Label>
											<Label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
												<RadioGroupItem value="unlisted" />
												<span>
													<span className="block font-medium">Não listado</span>
													<span className="text-xs text-muted-foreground">
														Acesso pelo link. Quem receber o link poderá abrir a página e se inscrever.
													</span>
												</span>
											</Label>
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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
												{MAIN_STATUS_OPTIONS.filter((option) => !draftOnly || option.value === 'draft').map(
													(option) => {
														const Icon = option.icon;

														return (
															<Label
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
															</Label>
														);
													},
												)}
											</RadioGroup>
										</FormControl>
										<FormMessage />

										{/* Opções avançadas (colapsável) */}
										<Card className="">
											<Button
												variant="ghost"
												type="button"
												disabled={draftOnly}
												onClick={() => setShowAdvancedStatus(!showAdvancedStatus)}
												className="h-auto whitespace-normal flex w-full items-center justify-between p-3 text-left"
											>
												<span className="text-xs font-medium text-muted-foreground">Outras opções (avançado)</span>
												<ChevronDown
													className={cn(
														'size-3 text-muted-foreground transition-transform',
														showAdvancedStatus && 'rotate-180',
													)}
												/>
											</Button>

											{showAdvancedStatus && !draftOnly && (
												<div className="border-t p-3">
													<RadioGroup
														value={field.value}
														onValueChange={(value) => field.onChange(value as EventWizardFormValues['status'])}
														className="grid gap-3"
													>
														{ADVANCED_STATUS_OPTIONS.map((option) => {
															const Icon = option.icon;

															return (
																<Label
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
																</Label>
															);
														})}
													</RadioGroup>
												</div>
											)}
										</Card>
									</FormItem>
								)}
							/>
						</div>

						{/* Bloco 4: Opções avançadas (apenas se publicado) */}
						{isPublished && !isUnlisted && (
							<Card className="animate-in fade-in-50 slide-in-from-top-2 p-4 duration-200">
								<div className="mb-4 flex items-start gap-2">
									<Sparkles className="mt-0.5 size-4 text-primary" />
									<div>
										<h3 className="text-sm font-semibold">Opções de destaque</h3>
										<p className="text-xs text-muted-foreground">Aumente a visibilidade do seu evento publicado.</p>
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
								</div>
							</Card>
						)}
					</div>
				</div>
			</Card>

			{/* eventId is null: the event does not exist yet, so the sheet hands the
			    ticket back to the form instead of posting it. */}
			<TicketFormSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				pricing={isFree ? 'free' : 'paid'}
				eventId={null}
				groups={sheetGroups}
				ticket={editingTicket}
				onSaved={handleTicketSaved}
			/>
		</div>
	);
}
