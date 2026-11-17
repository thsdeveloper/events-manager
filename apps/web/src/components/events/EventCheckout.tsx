'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Globe, Mail, MapPin, QrCode, ShieldCheck } from 'lucide-react';
import type { EventTicket, MediaFile } from '@events-manager/contracts';
import TicketSelection, { TicketSelectionItem } from './TicketSelection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/design-system/atoms/Container';
import { Heading } from '@/components/design-system/atoms/Heading';
import { CheckoutSteps } from '@/components/design-system/molecules/CheckoutSteps';
import { OrderSummary } from '@/components/design-system/organisms/OrderSummary';
import MediaImage from '@/components/shared/MediaImage';
import { AttendeeCards, type AttendeeDraft, type AttendeeUnit } from '@/features/checkout/components/AttendeeCards';
import { CouponField } from '@/features/checkout/components/CouponField';
import { PaymentMethodSection } from '@/features/checkout/components/PaymentMethodSection';
import { usePaymentMethods, type PaymentMethod } from '@/features/checkout/api/usePaymentMethods';
import { formatEventDateRange, formatEventLocation } from '@/lib/event-schedule';
import { formatCurrency } from '@/lib/formatters';
import { useCoupon } from '@/features/checkout/api/useCoupon';
import { Input } from '@/components/ui/input';
import { DocumentInput, PhoneInput } from '@/components/ui/masked-inputs';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCheckout } from '@/hooks/useCheckout';
import { useInstallmentCheckout } from '@/hooks/useInstallmentCheckout';

interface EventCheckoutProps {
	event?: {
		coverImage?: string | MediaFile | null;
		endDate?: string | null;
		eventType?: string | null;
		locationAddress?: string | null;
		locationName?: string | null;
		slug?: string | null;
		startDate?: string | null;
	};
	ticketGroups?: Array<{ id: string; title: string; parent_id?: string | null }>;
	eventId: string;
	eventTitle: string;
	tickets: EventTicket[];
	userId?: string;
	defaultParticipantInfo?: {
		name: string;
		email: string;
	};
}

const STEPS = [
	{ id: 'tickets', label: 'Ingressos' },
	{ id: 'details', label: 'Seus dados' },
	{ id: 'payment', label: 'Pagamento' },
];

const toNumber = (value: number | string | null | undefined) => {
	const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;

	return Number.isFinite(parsed) ? (parsed as number) : 0;
};

export default function EventCheckout({
	event,
	eventId,
	eventTitle,
	tickets,
	ticketGroups = [],
	userId,
	defaultParticipantInfo,
}: EventCheckoutProps) {
	const router = useRouter();
	const [selectedTickets, setSelectedTickets] = useState<TicketSelectionItem[]>([]);
	// Três etapas: ingressos, dados da pessoa e pagamento. A escolha do meio de
	// pagamento só aparece na última, quando o carrinho e os dados já estão fechados.
	const [step, setStep] = useState<'tickets' | 'details' | 'payment'>('tickets');
	const [selectedInstallments, setSelectedInstallments] = useState<number | null>(1);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
	const { methods: availableMethods } = usePaymentMethods();
	const [participantInfo, setParticipantInfo] = useState({
		name: defaultParticipantInfo?.name || '',
		email: defaultParticipantInfo?.email || '',
		phone: '',
		document: '',
	});

	// Quem vai usar cada unidade. A chave é `${ticketId}:${índice}`; a primeira
	// unidade do carrinho nasce como sendo da própria pessoa.
	const [attendeeDrafts, setAttendeeDrafts] = useState<Record<string, AttendeeDraft>>({});
	const [attendeeErrors, setAttendeeErrors] = useState<Record<string, string>>({});
	const attendeeUnits = useMemo<AttendeeUnit[]>(
		() =>
			selectedTickets.flatMap((selection) => {
				const ticket = tickets.find((candidate) => candidate.id === selection.ticketId);

				return Array.from({ length: selection.quantity }, (_, index) => ({
					key: `${selection.ticketId}:${index}`,
					ticketId: selection.ticketId,
					ticketTitle: ticket?.title ?? 'Ingresso',
					index: index + 1,
					total: selection.quantity,
				}));
			}),
		[selectedTickets, tickets],
	);
	const draftFor = (unit: AttendeeUnit, index: number): AttendeeDraft =>
		attendeeDrafts[unit.key] ?? { mode: index === 0 ? 'me' : 'named', name: '', email: '' };

	// Só uma unidade pode ser "minha": marcar outra desmarca a anterior.
	const handleAttendeeChange = (key: string, draft: AttendeeDraft) => {
		setAttendeeErrors((current) => ({ ...current, [key]: '' }));
		setAttendeeDrafts((current) => {
			const next = { ...current };
			if (draft.mode === 'me') {
				attendeeUnits.forEach((unit, index) => {
					const other = next[unit.key] ?? draftFor(unit, index);
					if (unit.key !== key && other.mode === 'me') next[unit.key] = { ...other, mode: 'named' };
				});
			}
			next[key] = draft;

			return next;
		});
	};

	const attendeesFor = (ticketId: string) =>
		attendeeUnits
			.map((unit, index) => ({ unit, draft: draftFor(unit, index) }))
			.filter(({ unit }) => unit.ticketId === ticketId)
			.map(({ draft }) => {
				if (draft.mode === 'later') return null;
				if (draft.mode === 'me') {
					return {
						name: participantInfo.name.trim(),
						email: participantInfo.email.trim(),
						...(participantInfo.phone ? { phone: participantInfo.phone } : {}),
						...(participantInfo.document ? { document: participantInfo.document } : {}),
					};
				}

				return { name: draft.name.trim(), email: draft.email.trim() };
			});

	const coupon = useCoupon(eventId);
	const { createCheckoutSession, isLoading: isPaymentLoading, error: paymentError } = useCheckout({ eventId, userId });
	const {
		createInstallmentCheckout,
		isLoading: isInstallmentLoading,
		error: installmentError,
	} = useInstallmentCheckout({
		onSuccess: (data) => router.push(`/my-registrations/${data.registration_id}/pay`),
	});

	const isLoading = isPaymentLoading || isInstallmentLoading;
	const error = paymentError || installmentError;

	// Erros da compra seguem o padrão do restante do app: toast, não um alerta
	// fixo no topo da página, que fica longe do botão que a pessoa acabou de usar.
	useEffect(() => {
		if (!error) return;
		toast({ title: 'Não foi possível concluir a compra', description: error, variant: 'destructive' });
	}, [error]);

	const summaryItems = useMemo(
		() =>
			selectedTickets.flatMap((selection) => {
				const ticket = tickets.find((candidate) => candidate.id === selection.ticketId);
				if (!ticket) return [];

				const basePrice = toNumber(ticket.price);
				const isAbsorbed = (ticket.service_fee_type ?? 'passed_to_buyer') === 'absorbed';
				const unitPrice = isAbsorbed ? basePrice : toNumber(ticket.buyer_price ?? ticket.price);

				return [
					{
						id: selection.ticketId,
						title: ticket.title ?? 'Ingresso',
						quantity: selection.quantity,
						unitPrice,
						unitFee: Math.max(unitPrice - basePrice, 0),
					},
				];
			}),
		[selectedTickets, tickets],
	);

	const totalAmount = summaryItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
	const ticketData = tickets.find((candidate) => candidate.id === selectedTickets[0]?.ticketId);

	// Trocar de ingresso invalida o desconto: o cupom foi conferido para o
	// carrinho anterior e precisa ser reconferido com os novos valores.
	const handleSelectionChange = (items: TicketSelectionItem[]) => {
		setSelectedTickets(items);
		if (coupon.applied) coupon.clear();
	};

	const handleDetailsSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (!participantInfo.name.trim() || !participantInfo.email.trim()) return;
		const errors: Record<string, string> = {};
		attendeeUnits.forEach((unit, index) => {
			const draft = draftFor(unit, index);
			if (draft.mode !== 'named') return;
			if (!draft.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
				errors[unit.key] = 'Informe nome e e-mail, ou marque para preencher depois.';
		});
		setAttendeeErrors(errors);
		if (Object.keys(errors).length > 0) return;
		setStep('payment');
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!participantInfo.name || !participantInfo.email || selectedTickets.length === 0) return;

		try {
			// Parcelas via Pix são um plano próprio da plataforma; no cartão, quem
			// parcela é a página do provedor.
			if (
				paymentMethod === 'PIX' &&
				selectedInstallments &&
				selectedInstallments > 1 &&
				ticketData?.allow_installments
			) {
				await createInstallmentCheckout(selectedTickets[0], selectedInstallments, participantInfo);
			} else {
				await createCheckoutSession(
					selectedTickets.map((selection) => ({ ...selection, attendees: attendeesFor(selection.ticketId) })),
					participantInfo,
					coupon.applied?.code,
					paymentMethod,
				);
			}
		} catch {
			// O hook mantém a mensagem visível no formulário.
		}
	};

	const handleMethodChange = (method: PaymentMethod) => {
		setPaymentMethod(method);
		if (method === 'CARD') setSelectedInstallments(1);
	};

	const payableTotal = coupon.applied?.total ?? totalAmount;
	const ticketTypesLabel = `${tickets.length} ${tickets.length === 1 ? 'tipo disponível' : 'tipos disponíveis'}`;
	const eventMeta = [
		{ icon: CalendarDays, label: formatEventDateRange(event?.startDate, event?.endDate), name: 'Quando' },
		{
			icon: MapPin,
			label: formatEventLocation(event?.eventType, event?.locationName, event?.locationAddress),
			name: 'Onde',
		},
		{
			icon: Globe,
			label: event?.eventType === 'online' ? 'Online' : event?.eventType === 'hybrid' ? 'Híbrido' : 'Presencial',
			name: 'Formato',
		},
	].filter((item) => Boolean(item.label));

	const summary = (
		<OrderSummary
			actionLabel={step === 'tickets' ? 'Continuar para seus dados' : undefined}
			coupon={coupon.applied}
			footnote={
				step === 'payment' ? (
					paymentMethod === 'CARD' ? (
						'Você informa o cartão no ambiente seguro de pagamento.'
					) : (
						'Você paga com Pix no ambiente seguro de pagamento.'
					)
				) : step === 'details' ? (
					'Você escolhe a forma de pagamento na próxima etapa.'
				) : (
					<div className="space-y-3">
						<p>Você confere tudo antes de pagar.</p>
						<ul className="flex flex-wrap gap-x-4 gap-y-1.5">
							<li className="inline-flex items-center gap-1.5">
								<QrCode className="size-3.5" aria-hidden />
								Pix e cartão
							</li>
							<li className="inline-flex items-center gap-1.5">
								<ShieldCheck className="size-3.5" aria-hidden />
								Compra segura
							</li>
							<li className="inline-flex items-center gap-1.5">
								<Mail className="size-3.5" aria-hidden />
								Ingresso por e-mail
							</li>
						</ul>
					</div>
				)
			}
			isActionLoading={isLoading}
			items={summaryItems}
			onAction={() => setStep('details')}
			onRemoveCoupon={coupon.clear}
		>
			{coupon.applied ? null : (
				<CouponField
					error={coupon.error}
					isApplying={coupon.isApplying}
					onApply={(code) => coupon.apply(code, selectedTickets)}
				/>
			)}
		</OrderSummary>
	);

	return (
		<Container className={cn('py-8 lg:py-12', step === 'tickets' && 'pb-28 lg:pb-12')}>
			<div className="space-y-4">
				<CheckoutSteps currentStep={step} onStepSelect={(id) => setStep(id as typeof step)} steps={STEPS} />

				{/* O evento se apresenta uma vez só: nome, quando, onde e formato na
				    mesma cabeça de página, com a capa como miniatura. */}
				<div className="flex items-start gap-4 pt-2">
					{event?.coverImage ? (
						<div className="relative hidden size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
							<MediaImage uuid={event.coverImage} alt="" fill className="object-cover" />
						</div>
					) : null}
					<div className="min-w-0 space-y-2">
						<Heading as="h1" level="h1">
							{eventTitle}
						</Heading>
						{eventMeta.length > 0 ? (
							<dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
								{eventMeta.map(({ icon: Icon, label, name }) => (
									<div key={name} className="inline-flex items-center gap-1.5">
										<dt className="sr-only">{name}</dt>
										<Icon className="size-4 shrink-0" aria-hidden />
										<dd>{label}</dd>
									</div>
								))}
							</dl>
						) : null}
						{event?.slug ? (
							<Link
								className="inline-block text-sm font-medium text-primary hover:underline"
								href={`/eventos/${event.slug}`}
							>
								Ver detalhes do evento
							</Link>
						) : null}
					</div>
				</div>
			</div>

			<div className="mt-8 grid gap-8 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					{step === 'tickets' ? (
						<section aria-labelledby="tickets-title" className="space-y-4">
							<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
								<Heading as="h2" level="h3" id="tickets-title">
									Ingressos
								</Heading>
								<p className="text-sm text-muted-foreground">{ticketTypesLabel}</p>
							</div>
							<TicketSelection
								groups={ticketGroups}
								eventId={eventId}
								tickets={tickets}
								hideAction
								onCheckout={handleSelectionChange}
								onSelectionChange={handleSelectionChange}
								isLoading={isLoading}
							/>
						</section>
					) : step === 'details' ? (
						<Card>
							<CardHeader>
								<CardTitle>Seus dados</CardTitle>
								<CardDescription>Quem está comprando e quem vai usar cada ingresso.</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleDetailsSubmit} className="space-y-6" id="details-form">
									<div className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="name">Nome completo *</Label>
											<Input
												id="name"
												type="text"
												value={participantInfo.name}
												onChange={(event) => setParticipantInfo({ ...participantInfo, name: event.target.value })}
												required
												disabled={isLoading}
											/>
										</div>

										<div className="space-y-2">
											<Label htmlFor="email">E-mail *</Label>
											<Input
												id="email"
												type="email"
												value={participantInfo.email}
												onChange={(event) => setParticipantInfo({ ...participantInfo, email: event.target.value })}
												required
												disabled={isLoading}
											/>
										</div>

										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="phone">Telefone</Label>
												<PhoneInput
													id="phone"
													value={participantInfo.phone}
													onChange={(digits) => setParticipantInfo({ ...participantInfo, phone: digits })}
													disabled={isLoading}
												/>
											</div>

											<div className="space-y-2">
												<Label htmlFor="document">CPF</Label>
												<DocumentInput
													id="document"
													value={participantInfo.document}
													onChange={(digits) => setParticipantInfo({ ...participantInfo, document: digits })}
													disabled={isLoading}
												/>
											</div>
										</div>
									</div>

									<section aria-labelledby="attendees-title" className="space-y-3 border-t pt-6">
										<div>
											<Heading as="h3" level="h4" id="attendees-title">
												Participantes
											</Heading>
											<p className="text-sm text-muted-foreground">
												Os ingressos são nominais. Diga quem vai usar cada um, ou deixe para informar depois.
											</p>
										</div>
										<AttendeeCards
											buyer={{ name: participantInfo.name, email: participantInfo.email }}
											drafts={Object.fromEntries(attendeeUnits.map((unit, index) => [unit.key, draftFor(unit, index)]))}
											errors={attendeeErrors}
											onChange={handleAttendeeChange}
											units={attendeeUnits}
										/>
									</section>

									<div className="flex flex-col gap-3 pt-2 sm:flex-row">
										<Button
											type="button"
											variant="outline"
											onClick={() => setStep('tickets')}
											disabled={isLoading}
											className="sm:flex-1"
										>
											Voltar
										</Button>
										<Button type="submit" disabled={isLoading} className="sm:flex-1">
											Continuar para pagamento
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<CardTitle>Pagamento</CardTitle>
								<CardDescription>Escolha como pagar e finalize a compra</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className="space-y-6" id="checkout-form">
									<PaymentMethodSection
										availableMethods={availableMethods}
										disabled={isLoading}
										method={paymentMethod}
										onInstallmentChange={setSelectedInstallments}
										onMethodChange={handleMethodChange}
										selectedInstallments={selectedInstallments}
										ticket={ticketData}
										totalAmount={coupon.applied?.total ?? totalAmount}
									/>

									<div className="flex flex-col gap-3 pt-2 sm:flex-row">
										<Button
											type="button"
											variant="outline"
											onClick={() => setStep('details')}
											disabled={isLoading}
											className="sm:flex-1"
										>
											Voltar
										</Button>
										<Button type="submit" disabled={isLoading} className="sm:flex-1">
											{isLoading ? 'Processando...' : 'Finalizar compra'}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Resumo acompanha a rolagem no desktop e fica no fim no celular. */}
				<aside className="lg:sticky lg:top-24">{summary}</aside>
			</div>

			{/* No celular o resumo fica abaixo da lista e o botão sumiria da tela:
			    a barra fixa mantém o total e o próximo passo sempre à mão. */}
			{step === 'tickets' ? (
				<section
					aria-label="Total e próximo passo"
					className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden"
				>
					<Container className="flex items-center justify-between gap-4 py-3">
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">Total</p>
							<p className="text-lg font-bold tabular-nums leading-tight text-foreground">
								{formatCurrency(payableTotal)}
							</p>
						</div>
						<Button
							className="shrink-0"
							disabled={selectedTickets.length === 0 || isLoading}
							onClick={() => setStep('details')}
							type="button"
						>
							Continuar para seus dados
						</Button>
					</Container>
				</section>
			) : null}
		</Container>
	);
}
