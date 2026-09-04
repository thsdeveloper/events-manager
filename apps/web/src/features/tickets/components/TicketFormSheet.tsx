'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, CreditCard, Eye, Save, Tag, Users } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFeeConfig } from '../api/useFeeConfig';
import type { TicketDraft } from '../types';
import { TicketFeeSummary } from './TicketFeeSummary';

const ticketFormSchema = z
	.object({
		title: z.string().trim().min(1, 'Informe o nome do ingresso').max(255, 'Máximo de 255 caracteres'),
		description: z.string().max(500, 'Máximo de 500 caracteres').optional(),
		quantity: z.coerce.number().int('Use um número inteiro').min(1, 'Mínimo de 1').max(1_000_000, 'Quantidade alta demais'),
		price: z.coerce.number().min(0, 'O valor não pode ser negativo'),
		service_fee_type: z.enum(['absorbed', 'passed_to_buyer']),
		visibility: z.enum(['public', 'invited_only', 'manual']),
		sale_start_date: z.string().optional(),
		sale_end_date: z.string().optional(),
		min_quantity_per_purchase: z.coerce.number().int().min(1, 'Mínimo de 1').max(100, 'Máximo de 100'),
		max_quantity_per_purchase: z.coerce.number().int().min(1, 'Mínimo de 1').max(100, 'Máximo de 100'),
		allow_installments: z.boolean(),
		max_installments: z.coerce.number().int().min(2, 'Mínimo de 2').max(12, 'Máximo de 12').optional(),
	})
	.superRefine((values, context) => {
		if (values.max_quantity_per_purchase < values.min_quantity_per_purchase) {
			context.addIssue({
				code: 'custom',
				message: 'O máximo por compra deve ser maior ou igual ao mínimo',
				path: ['max_quantity_per_purchase'],
			});
		}
		if (values.sale_start_date && values.sale_end_date && values.sale_end_date <= values.sale_start_date) {
			context.addIssue({
				code: 'custom',
				message: 'O fim das vendas deve ser depois do início',
				path: ['sale_end_date'],
			});
		}
		if (values.allow_installments && !values.max_installments) {
			context.addIssue({ code: 'custom', message: 'Informe o número de parcelas', path: ['max_installments'] });
		}
	});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

const emptyValues: TicketFormValues = {
	title: '',
	description: '',
	quantity: 100,
	price: 0,
	service_fee_type: 'passed_to_buyer',
	visibility: 'public',
	sale_start_date: '',
	sale_end_date: '',
	min_quantity_per_purchase: 1,
	max_quantity_per_purchase: 5,
	allow_installments: false,
	max_installments: undefined,
};

function toFormValues(ticket: TicketDraft | null): TicketFormValues {
	if (!ticket) return emptyValues;

	return {
		title: ticket.title ?? '',
		description: ticket.description ?? '',
		quantity: ticket.quantity ?? 100,
		price: Number(ticket.price ?? 0),
		service_fee_type: ticket.service_fee_type ?? 'passed_to_buyer',
		visibility: ticket.visibility ?? 'public',
		sale_start_date: ticket.sale_start_date?.slice(0, 16) ?? '',
		sale_end_date: ticket.sale_end_date?.slice(0, 16) ?? '',
		min_quantity_per_purchase: ticket.min_quantity_per_purchase ?? 1,
		max_quantity_per_purchase: ticket.max_quantity_per_purchase ?? 5,
		allow_installments: ticket.allow_installments ?? false,
		max_installments: ticket.max_installments ?? undefined,
	};
}

export interface TicketFormSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Free events skip pricing entirely. */
	pricing: 'paid' | 'free';
	/**
	 * The event the ticket belongs to. `null` means the event does not exist yet
	 * (creation wizard): nothing is sent to the API and the ticket is handed back
	 * to the caller instead.
	 */
	eventId: string | null;
	/** Ticket being edited, or null to create a new one. */
	ticket?: TicketDraft | null;
	onSaved: (ticket: TicketDraft) => void;
}

export function TicketFormSheet({ open, onOpenChange, pricing, eventId, ticket, onSaved }: TicketFormSheetProps) {
	const { toast } = useToast();
	const { feeConfig, isFallback } = useFeeConfig();
	const formId = useId();
	const isEditing = Boolean(ticket);
	const isFree = pricing === 'free';

	const form = useForm<TicketFormValues>({
		resolver: zodResolver(ticketFormSchema),
		defaultValues: emptyValues,
		mode: 'onBlur',
	});

	// Reset on open rather than on every `ticket` change, so reopening the sheet
	// always starts from the record the caller passed and never from stale edits.
	useEffect(() => {
		if (open) form.reset(toFormValues(ticket ?? null));
	}, [form, open, ticket]);

	// useWatch subscribes to these two fields only; form.watch() would re-render
	// the whole sheet on every keystroke in any field.
	const price = useWatch({ control: form.control, name: 'price' });
	const serviceFeeType = useWatch({ control: form.control, name: 'service_fee_type' });
	const allowInstallments = useWatch({ control: form.control, name: 'allow_installments' });
	const numericPrice = useMemo(() => (isFree ? 0 : Number(price) || 0), [isFree, price]);

	const submit = useCallback(
		async (values: TicketFormValues) => {
			const payload: TicketDraft = {
				...ticket,
				title: values.title.trim(),
				description: values.description?.trim() || null,
				quantity: values.quantity,
				price: isFree ? 0 : values.price,
				service_fee_type: isFree ? 'absorbed' : values.service_fee_type,
				visibility: values.visibility,
				sale_start_date: values.sale_start_date ? new Date(values.sale_start_date).toISOString() : null,
				sale_end_date: values.sale_end_date ? new Date(values.sale_end_date).toISOString() : null,
				min_quantity_per_purchase: values.min_quantity_per_purchase,
				max_quantity_per_purchase: values.max_quantity_per_purchase,
				allow_installments: isFree ? false : values.allow_installments,
				max_installments: !isFree && values.allow_installments ? values.max_installments : null,
			};

			// Draft mode: the event has no id yet, so the ticket goes back to the
			// caller and is persisted together with the event.
			if (!eventId) {
				onSaved({ ...payload, clientId: ticket?.clientId ?? crypto.randomUUID() });
				onOpenChange(false);

				return;
			}

			try {
				const endpoint = ticket?.id ? `/api/admin/ingressos/${ticket.id}` : '/api/admin/ingressos';
				const response = await fetch(endpoint, {
					method: ticket?.id ? 'PATCH' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ ...payload, event_id: eventId }),
				});
				const body = await response.json().catch(() => null);
				if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar o ingresso.');
				onSaved({ ...payload, id: body?.id ?? ticket?.id });
				toast({ title: ticket?.id ? 'Ingresso atualizado' : 'Ingresso criado', variant: 'success' });
				onOpenChange(false);
			} catch (error) {
				toast({
					title: 'Erro ao salvar ingresso',
					description: error instanceof Error ? error.message : 'Tente novamente.',
					variant: 'destructive',
				});
			}
		},
		[eventId, isFree, onOpenChange, onSaved, ticket, toast],
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
				<SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
					<SheetTitle className="flex items-center gap-2 text-xl">
						<Tag className="size-5 text-primary" />
						{isEditing ? 'Editar ingresso' : 'Novo ingresso'}
					</SheetTitle>
					<SheetDescription>
						{isFree
							? 'Defina como os participantes garantem a vaga neste evento gratuito.'
							: 'Defina preço, disponibilidade e regras de compra deste tipo de ingresso.'}
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form
						id={formId}
						onSubmit={form.handleSubmit(submit)}
						className="flex-1 space-y-8 overflow-y-auto p-6"
					>
						<section className="space-y-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
								<Tag className="size-4 text-muted-foreground" />
								Identificação
							</h3>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nome do ingresso *</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Ex: Pista, VIP, Meia-entrada" autoFocus />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Descrição</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												rows={2}
												placeholder="O que está incluso neste ingresso?"
												className="resize-none"
											/>
										</FormControl>
										<FormDescription>Aparece para o comprador na página do evento.</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</section>

						{!isFree && (
							<section className="space-y-4">
								<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
									<CreditCard className="size-4 text-muted-foreground" />
									Preço e taxa
								</h3>
								<FormField
									control={form.control}
									name="price"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Valor do ingresso (R$) *</FormLabel>
											<FormControl>
												<Input {...field} type="number" min="0" step="0.01" inputMode="decimal" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="service_fee_type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Quem paga a taxa de conveniência</FormLabel>
											<FormControl>
												<RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
													{[
														{
															value: 'passed_to_buyer' as const,
															label: 'O comprador paga',
															hint: 'Padrão do mercado. Você recebe praticamente o valor cheio.',
														},
														{
															value: 'absorbed' as const,
															label: 'Você absorve a taxa',
															hint: 'O preço anunciado é o final, e a taxa sai do seu repasse.',
														},
													].map(option => (
														<label
															key={option.value}
															className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
																field.value === option.value
																	? 'border-primary bg-primary/5'
																	: 'border-border hover:bg-muted'
															}`}
														>
															<RadioGroupItem value={option.value} className="mt-0.5" />
															<span>
																<span className="block text-sm font-medium">{option.label}</span>
																<span className="block text-xs text-muted-foreground">{option.hint}</span>
															</span>
														</label>
													))}
												</RadioGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<TicketFeeSummary
									price={numericPrice}
									serviceFeeType={serviceFeeType}
									feeConfig={feeConfig}
									isFallback={isFallback}
								/>

								<FormField
									control={form.control}
									name="allow_installments"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
											<FormControl>
												<Checkbox checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
											<div className="space-y-0.5">
												<FormLabel className="cursor-pointer">Permitir parcelamento no cartão</FormLabel>
												<FormDescription>O comprador pode dividir o valor em mais de uma parcela.</FormDescription>
											</div>
										</FormItem>
									)}
								/>
								{allowInstallments && (
									<FormField
										control={form.control}
										name="max_installments"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Máximo de parcelas</FormLabel>
												<FormControl>
													<Input
														{...field}
														value={field.value ?? ''}
														type="number"
														min="2"
														max="12"
														inputMode="numeric"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</section>
						)}

						<section className="space-y-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
								<Users className="size-4 text-muted-foreground" />
								Disponibilidade
							</h3>
							<FormField
								control={form.control}
								name="quantity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Quantidade disponível *</FormLabel>
										<FormControl>
											<Input {...field} type="number" min="1" inputMode="numeric" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="grid gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="min_quantity_per_purchase"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Mínimo por compra</FormLabel>
											<FormControl>
												<Input {...field} type="number" min="1" max="100" inputMode="numeric" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="max_quantity_per_purchase"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Máximo por compra</FormLabel>
											<FormControl>
												<Input {...field} type="number" min="1" max="100" inputMode="numeric" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="visibility"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center gap-1.5">
											<Eye className="size-3.5 text-muted-foreground" />
											Visibilidade
										</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="public">Público — qualquer pessoa vê e compra</SelectItem>
												<SelectItem value="invited_only">Apenas convidados — exige link direto</SelectItem>
												<SelectItem value="manual">Manual — só você emite</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</section>

						<section className="space-y-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
								<CalendarClock className="size-4 text-muted-foreground" />
								Período de venda
							</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="sale_start_date"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Início</FormLabel>
											<FormControl>
												<Input {...field} type="datetime-local" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="sale_end_date"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Fim</FormLabel>
											<FormControl>
												<Input {...field} type="datetime-local" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Deixe em branco para vender enquanto o evento estiver publicado.
							</p>
						</section>
					</form>
				</Form>

				<div className="flex items-center justify-end gap-2 border-t bg-background px-6 py-4">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="submit" form={formId} loading={form.formState.isSubmitting}>
						<Save className="mr-2 size-4" />
						{isEditing ? 'Salvar alterações' : 'Adicionar ingresso'}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
