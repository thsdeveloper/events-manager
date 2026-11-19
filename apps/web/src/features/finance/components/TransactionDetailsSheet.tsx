'use client';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
	ArrowUpRight,
	CircleCheck,
	Clock3,
	CreditCard,
	RefreshCw,
	ReceiptText,
	Ticket,
	UserRound,
	X,
} from 'lucide-react';
import type { FinanceTransactionDetails } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/formatters';
import { TransactionStatusBadge } from './TransactionStatusBadge';

function date(value: string | null | undefined) {
	if (!value) return 'Não informado';
	const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);

	return Number.isNaN(parsed.getTime())
		? 'Não informado'
		: parsed.toLocaleString('pt-BR', {
				timeZone: 'America/Sao_Paulo',
				dateStyle: 'short',
				...(value.length === 10 ? {} : { timeStyle: 'short' as const }),
			});
}
function money(value: number | null | undefined) {
	return value == null ? 'A confirmar' : formatCurrency(value);
}
function Detail({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="min-w-0">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{children || 'Não informado'}</dd>
		</div>
	);
}
function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
	return (
		<section className="rounded-2xl border bg-background p-4 sm:p-5">
			<h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
				{icon}
				{title}
			</h3>
			{children}
		</section>
	);
}
function paymentLabel(r: FinanceTransactionDetails['registration']) {
	const method = r.payment_method?.toLowerCase();
	if (r.is_installment_payment) return `Pix parcelado · ${r.total_installments ?? '—'} parcelas`;
	if (method === 'card' || method === 'credit_card')
		return `Cartão de crédito${r.card_installments && r.card_installments > 1 ? ` · ${r.card_installments} parcelas` : ' · à vista'}`;
	if (method === 'pix') return 'Pix à vista';
	if (method === 'boleto') return 'Boleto à vista';

	return r.payment_method || 'Não informado';
}
function movementLabel(type: string | null) {
	if (type === 'transparent.reconciled_paid') return 'Pagamento confirmado no provedor';
	if (type?.endsWith('.completed')) return 'Pagamento processado';
	if (type?.endsWith('.refunded')) return 'Reembolso';
	if (type?.endsWith('.disputed')) return 'Pagamento em disputa';
	if (type?.endsWith('.lost')) return 'Disputa encerrada';
	if (type?.endsWith('.expired')) return 'Cobrança expirada';
	if (type?.endsWith('.cancelled')) return 'Cobrança cancelada';

	return type || 'Movimentação registrada';
}
function Content({ details }: { details: FinanceTransactionDetails }) {
	const { transaction: t, registration: r, event, installments, tickets, movements } = details;
	const paid = installments.filter((i) => i.status === 'paid');
	const paidAmount = paid.reduce((sum, i) => sum + i.amount, 0);
	const current = installments.find((i) => i.provider_transaction_id === t.provider_object_id);

	return (
		<div className="space-y-5">
			<div className="rounded-2xl border border-[#E4DAF7] bg-[#F3EEFF] p-5 text-[#231A33]">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm font-medium">Valor desta transação</p>
					<TransactionStatusBadge status={t.status} />
				</div>
				<p className="mt-2 text-3xl font-semibold tracking-tight">{money(t.amount)}</p>
				<p className="mt-2 text-sm">
					{paymentLabel(r)}
					{current ? ` · Parcela ${current.installment_number}` : ''}
				</p>
				<p className="mt-1 text-xs text-[#6F6281]">Registrada em {date(t.date_created)}</p>
			</div>
			<Section title="Taxas e recebimento" icon={<CreditCard className="size-4" />}>
				{t.settlement_status === 'pending' ? (
					<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
						<p className="flex items-center gap-2 text-sm font-semibold">
							<Clock3 className="size-4" />
							Conciliação pendente
						</p>
						<p className="mt-1 text-xs leading-relaxed">
							O pagamento foi confirmado. Aguardamos o provedor confirmar as taxas e a liquidação para apurar o valor
							líquido disponível para repasse.
						</p>
					</div>
				) : t.settlement_status === 'settled' ? (
					<p className="mb-4 flex items-center gap-2 text-sm text-emerald-700">
						<CircleCheck className="size-4" />
						Valores conciliados com o provedor.
					</p>
				) : (
					<p className="mb-4 text-sm text-muted-foreground">
						Esta movimentação não representa saldo liberado para repasse.
					</p>
				)}
				<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Detail label="Taxa da plataforma">{money(t.platform_fee)}</Detail>
					<Detail label="Tarifa do provedor">{money(t.provider_fee)}</Detail>
					<Detail label="Líquido desta transação">{money(t.organizer_net)}</Detail>
				</dl>
			</Section>
			<div className="grid gap-5 sm:grid-cols-2">
				<Section title="Comprador" icon={<UserRound className="size-4" />}>
					<dl className="space-y-3">
						<Detail label="Nome">{r.participant_name}</Detail>
						<Detail label="E-mail">{r.participant_email}</Detail>
						<Detail label="CPF / documento">{r.participant_document}</Detail>
						<Detail label="Telefone">{r.participant_phone}</Detail>
					</dl>
				</Section>
				<Section title="Compra" icon={<ReceiptText className="size-4" />}>
					<dl className="grid grid-cols-2 gap-3">
						<Detail label="Pagamento da compra">
							<TransactionStatusBadge status={r.payment_status} />
						</Detail>
						<Detail label="Situação do pedido">
							<TransactionStatusBadge status={r.status} />
						</Detail>
						<Detail label="Ingressos">{String(r.quantity)}</Detail>
						<Detail label="Total da compra">{money(r.total_amount)}</Detail>
						<Detail label="Valor unitário">{money(r.unit_price)}</Detail>
						<Detail label="Taxa de serviço da compra">{money(r.service_fee)}</Detail>
						<Detail label="Criada em">{date(r.date_created)}</Detail>
						<Detail label="Atualizada em">{date(r.date_updated)}</Detail>
					</dl>
				</Section>
			</div>
			{installments.length > 0 ? (
				<Section title="Parcelas do Pix" icon={<CreditCard className="size-4" />}>
					<div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
						<p className="font-semibold">
							{paid.length} de {installments.length} parcelas pagas
						</p>
						<p className="text-muted-foreground">
							{money(paidAmount)} pagos · {money(Math.max(0, (r.total_amount ?? 0) - paidAmount))} pendentes
						</p>
					</div>
					<ul aria-label="Parcelas da compra" className="space-y-3">
						{installments.map((i) => (
							<li
								key={i.id}
								className={`rounded-xl border p-3 ${i.id === current?.id ? 'border-[#B699F7] bg-[#F3EEFF]/50' : ''}`}
							>
								<div className="flex flex-wrap justify-between gap-2">
									<span className="text-sm font-semibold">
										Parcela {i.installment_number} · {money(i.amount)}
										{i.id === current?.id ? (
											<span className="ml-2 text-xs font-normal text-[#743DF5]">Esta transação</span>
										) : null}
									</span>
									<TransactionStatusBadge status={i.status} />
								</div>
								<dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
									<Detail label="Vencimento">{date(i.due_date)}</Detail>
									<Detail label="Paga em">{i.paid_at ? date(i.paid_at) : 'Ainda não paga'}</Detail>
									<Detail label="Confirmação">
										{i.payment_confirmed_at ? date(i.payment_confirmed_at) : 'Não registrada'}
									</Detail>
								</dl>
								<p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">
									{i.provider_transaction_id || 'Cobrança ainda não emitida'}
								</p>
							</li>
						))}
					</ul>
				</Section>
			) : null}
			<Section title="Evento e ingressos" icon={<Ticket className="size-4" />}>
				<dl className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Detail label="Evento">{event.title}</Detail>
					<Detail label="Tipo de ingresso">{details.ticket_type?.title}</Detail>
					<Detail label="Início">{date(event.start_date)}</Detail>
					<Detail label="Término">{date(event.end_date)}</Detail>
					<Detail label="Local">{event.location_name}</Detail>
					<Detail label="Endereço">{event.location_address}</Detail>
				</dl>
				{tickets.length ? (
					<ul aria-label="Ingressos da compra" className="space-y-2">
						{tickets.map((ticket) => (
							<li key={ticket.id} className="rounded-xl bg-muted/40 p-3">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<p className="text-sm font-semibold">
											Ingresso {String(ticket.sequence).padStart(2, '0')} ·{' '}
											{ticket.attendee_name || 'Participante a informar'}
										</p>
										<p className="mt-1 break-all text-xs text-muted-foreground">{ticket.attendee_email}</p>
									</div>
									<span className="text-xs text-muted-foreground">{ticket.is_buyer ? 'Comprador' : 'Convidado'}</span>
								</div>
								<p className="mt-2 font-mono text-xs">{ticket.ticket_code}</p>
								<p className="mt-2 text-xs text-muted-foreground">
									{ticket.check_in_date ? `Check-in em ${date(ticket.check_in_date)}` : 'Check-in não realizado'}
								</p>
								<dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
									<Detail label="Valor unitário">{money(ticket.unit_price)}</Detail>
									<Detail label="Serviço">{money(ticket.service_fee)}</Detail>
									<Detail label="Desconto">{money(ticket.discount)}</Detail>
									<Detail label="Total do ingresso">{money(ticket.total_amount)}</Detail>
								</dl>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-muted-foreground">Nenhum ingresso nominal registrado.</p>
				)}
			</Section>
			<Section title="Histórico de movimentações" icon={<Clock3 className="size-4" />}>
				<ol className="space-y-4">
					{movements.map((m) => (
						<li key={m.id} className="border-l-2 border-[#E4DAF7] pl-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-sm font-semibold">{movementLabel(m.event_type)}</p>
								<TransactionStatusBadge status={m.status} />
							</div>
							<p className="mt-1 text-sm">
								{money(m.amount)} <span className="text-muted-foreground">· {date(m.date_created)}</span>
							</p>
							{m.settlement_status === 'pending' ? (
								<p className="mt-1 text-xs text-amber-700">Taxas e líquido aguardando conciliação</p>
							) : null}
							<p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{m.provider_object_id}</p>
						</li>
					))}
				</ol>
			</Section>
			<Section title="Identificadores e comprovante">
				<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Detail label="ID da transação">{t.id}</Detail>
					<Detail label="ID do pedido">{r.id}</Detail>
					<Detail label="Provedor">{t.provider}</Detail>
					<Detail label="ID da cobrança">{t.provider_object_id}</Detail>
					<Detail label="Evento do provedor">{t.event_type}</Detail>
					<Detail label="ID do evento no provedor">{t.provider_event_id}</Detail>
					<Detail label="Estado informado pelo provedor">{t.provider_status}</Detail>
					<Detail label="ID do checkout">{r.provider_checkout_id}</Detail>
					{r.checkout_group_id ? <Detail label="Grupo da compra">{r.checkout_group_id}</Detail> : null}
					{r.provider_refund_id ? <Detail label="ID do reembolso">{r.provider_refund_id}</Detail> : null}
				</dl>
				{r.receipt_url && /^https:\/\//i.test(r.receipt_url) ? (
					<Button asChild variant="outline" className="mt-5">
						<a href={r.receipt_url} target="_blank" rel="noopener noreferrer">
							Abrir comprovante
							<ArrowUpRight className="size-4" />
						</a>
					</Button>
				) : (
					<p className="mt-4 text-xs text-muted-foreground">
						O provedor ainda não disponibilizou um comprovante para esta compra.
					</p>
				)}
				{r.cancelled_at ? (
					<p className="mt-4 text-sm text-destructive">
						Cancelado em {date(r.cancelled_at)}. {r.cancelled_reason}
					</p>
				) : null}
				{r.notes ? (
					<p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">Observações: {r.notes}</p>
				) : null}
			</Section>
		</div>
	);
}
export function TransactionDetailsSheet({ transactionId, onClose }: { transactionId: string; onClose(): void }) {
	const queryClient = useQueryClient();
	const query = useQuery<FinanceTransactionDetails>({
		queryKey: ['finance', 'transaction', transactionId],
		queryFn: async ({ signal }) => {
			const response = await fetch(`/api/organizer/finance/transactions/${transactionId}`, {
				credentials: 'include',
				signal,
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.detail || 'Não foi possível carregar a transação.');

			return data;
		},
		retry: false,
	});
	function close() {
		void queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] });
		void queryClient.invalidateQueries({ queryKey: ['finance', 'overview'] });
		onClose();
	}

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<SheetContent hideCloseButton className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
				<SheetHeader className="shrink-0 border-b px-5 py-4 text-left sm:px-7">
					<div className="flex items-center justify-between gap-3">
						<SheetTitle>Detalhes da transação</SheetTitle>
						<div className="flex shrink-0 gap-1">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Atualizar transação"
								disabled={query.isFetching}
								onClick={() => void query.refetch()}
							>
								<RefreshCw className="size-4" />
							</Button>
							<SheetClose asChild>
								<Button variant="ghost" size="icon" aria-label="Fechar detalhes">
									<X className="size-4" />
								</Button>
							</SheetClose>
						</div>
					</div>
					<SheetDescription>Pagamento, parcelas e informações da compra.</SheetDescription>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-5 sm:p-7">
					{query.isPending ? (
						<p role="status" className="py-10 text-center text-sm text-muted-foreground">
							Carregando detalhes da transação…
						</p>
					) : query.isError ? (
						<div role="alert" className="rounded-xl border border-destructive/30 bg-background p-5">
							<p className="text-sm">{query.error.message}</p>
							<Button className="mt-4" onClick={() => void query.refetch()}>
								Tentar novamente
							</Button>
						</div>
					) : (
						<Content details={query.data} />
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
