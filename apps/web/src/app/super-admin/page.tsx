import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchPlatformOverview } from '@/features/super-admin/api/server';
import { PlatformMetricCard } from '@/features/super-admin/components/PlatformMetricCard';
import {
	Banknote,
	Building2,
	CalendarDays,
	CircleDollarSign,
	ReceiptText,
	TicketCheck,
	WalletCards,
} from 'lucide-react';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export default async function SuperAdminOverviewPage() {
	const data = await fetchPlatformOverview();
	const maxGross = Math.max(...data.topOrganizers.map((item) => item.gross), 1);

	return (
		<div className="space-y-8">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-primary">Visão geral</p>
					<h1 className="mt-1 text-3xl font-bold tracking-tight">Saúde do ecossistema</h1>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
						Receita, operação e valores a repassar consolidados em uma única visão.
					</p>
				</div>
				<div
					className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${data.provider === 'mock' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
				>
					{data.provider === 'mock' ? 'Gateway em simulação local' : 'AbacatePay conectado'}
				</div>
			</header>
			<section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<PlatformMetricCard
					label="Volume vendido"
					value={currency.format(data.metrics.grossRevenue)}
					helper={`${compact.format(data.metrics.ticketsSold)} ingressos pagos`}
					icon={CircleDollarSign}
					tone="emerald"
				/>
				<PlatformMetricCard
					label="Receita da plataforma"
					value={currency.format(data.metrics.platformRevenue)}
					helper={`${currency.format(data.metrics.providerFees)} em tarifas do gateway`}
					icon={Banknote}
				/>
				<PlatformMetricCard
					label="Saldo dos organizadores"
					value={currency.format(data.metrics.organizerPayable)}
					helper="Valor líquido ainda disponível para repasse"
					icon={WalletCards}
					tone="blue"
				/>
				<PlatformMetricCard
					label="Organizadores ativos"
					value={`${data.metrics.activeOrganizers}/${data.metrics.organizers}`}
					helper={`${data.metrics.publishedEvents} eventos publicados`}
					icon={Building2}
					tone="amber"
				/>
			</section>
			<section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
				<Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="font-semibold">Organizadores por volume</h2>
							<p className="mt-1 text-sm text-muted-foreground">Quem mais movimenta a plataforma.</p>
						</div>
						<Building2 className="size-5 text-muted-foreground" />
					</div>
					<div className="mt-6 space-y-5">
						{data.topOrganizers.length ? (
							data.topOrganizers.map((item, index) => (
								<div key={item.id}>
									<div className="mb-2 flex items-center justify-between gap-4 text-sm">
										<div className="min-w-0">
											<span className="mr-2 text-xs font-semibold text-muted-foreground">0{index + 1}</span>
											<span className="font-medium text-foreground">{item.name}</span>
											<span className="ml-2 text-xs text-muted-foreground">{item.events} eventos</span>
										</div>
										<span className="shrink-0 font-semibold">{currency.format(item.gross)}</span>
									</div>
									<Progress
										value={(item.gross / maxGross) * 100}
										aria-label={`Volume de ${item.name}`}
										className="h-2"
									/>
								</div>
							))
						) : (
							<p className="py-10 text-center text-sm text-muted-foreground">As vendas aparecerão aqui.</p>
						)}
					</div>
				</Card>
				<Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
					<h2 className="font-semibold">Operação agora</h2>
					<p className="mt-1 text-sm text-muted-foreground">Itens que ajudam a dimensionar o ecossistema.</p>
					<div className="mt-6 grid grid-cols-2 gap-3">
						{[
							{ label: 'Eventos', value: data.metrics.events, icon: CalendarDays },
							{ label: 'Publicados', value: data.metrics.publishedEvents, icon: TicketCheck },
							{ label: 'Ingressos', value: data.metrics.ticketsSold, icon: ReceiptText },
							{ label: 'Organizadores', value: data.metrics.organizers, icon: Building2 },
						].map((item) => {
							const Icon = item.icon;

							return (
								<div key={item.label} className="rounded-lg bg-muted/40 p-4">
									<Icon className="size-5 text-primary" />
									<p className="mt-3 text-2xl font-bold">{compact.format(item.value)}</p>
									<p className="text-xs text-muted-foreground">{item.label}</p>
								</div>
							);
						})}
					</div>
				</Card>
			</section>
			<Card className="rounded-lg border border-border bg-card shadow-sm">
				<div className="border-b border-border p-6">
					<h2 className="font-semibold">Transações recentes</h2>
					<p className="mt-1 text-sm text-muted-foreground">Últimas confirmações e movimentações do gateway.</p>
				</div>
				<div className="overflow-x-auto">
					<Table className="w-full text-left text-sm">
						<TableHeader className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
							<TableRow>
								<TableHead className="px-6 py-3">Participante</TableHead>
								<TableHead className="px-6 py-3">Evento</TableHead>
								<TableHead className="px-6 py-3">Organizador</TableHead>
								<TableHead className="px-6 py-3">Status</TableHead>
								<TableHead className="px-6 py-3 text-right">Valor</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="divide-y divide-border">
							{data.recentTransactions.map((transaction) => (
								<TableRow key={transaction.id} className="hover:bg-muted/40">
									<TableCell className="px-6 py-4 font-medium">
										{transaction.registration_id?.participant_name ?? '—'}
									</TableCell>
									<TableCell className="px-6 py-4 text-muted-foreground">
										{transaction.registration_id?.event_id?.title ?? '—'}
									</TableCell>
									<TableCell className="px-6 py-4 text-muted-foreground">
										{transaction.registration_id?.event_id?.organizer_id?.name ?? '—'}
									</TableCell>
									<TableCell className="px-6 py-4">
										<Badge
											variant="secondary"
											className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
										>
											{transaction.status}
										</Badge>
									</TableCell>
									<TableCell className="px-6 py-4 text-right font-semibold">
										{currency.format(Number(transaction.amount ?? 0))}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{!data.recentTransactions.length && (
						<p className="p-10 text-center text-sm text-muted-foreground">Nenhuma transação registrada.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
