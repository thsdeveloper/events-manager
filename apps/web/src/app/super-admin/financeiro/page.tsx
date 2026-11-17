import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
	fetchPlatformOrganizers,
	fetchPlatformPayouts,
	fetchPlatformTransactions,
} from '@/features/super-admin/api/server';
import { PayoutCreationPanel } from '@/features/super-admin/components/PayoutCreationPanel';
import { PlatformMetricCard } from '@/features/super-admin/components/PlatformMetricCard';
import { Banknote, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function PlatformFinancePage() {
	const [transactions, payouts, organizers] = await Promise.all([
		fetchPlatformTransactions(),
		fetchPlatformPayouts(),
		fetchPlatformOrganizers('limit=100&status=active'),
	]);
	const succeeded = transactions.data.filter((item) => item.status === 'succeeded');
	const gross = succeeded.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
	const platform = succeeded.reduce((sum, item) => sum + Number(item.platform_fee ?? 0), 0);
	const provider = succeeded.reduce((sum, item) => sum + Number(item.provider_fee ?? 0), 0);
	const net = succeeded.reduce((sum, item) => sum + Number(item.organizer_net ?? 0), 0);
	const enabledOrganizers = organizers.data
		.filter((item) => item.payout_status === 'enabled')
		.map((item) => ({ id: item.id, name: item.name }));

	return (
		<div className="space-y-8">
			<header>
				<p className="text-sm font-semibold text-primary">Financeiro global</p>
				<h1 className="mt-1 text-3xl font-bold tracking-tight">Fluxo financeiro da plataforma</h1>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
					Conciliação de vendas, tarifas do gateway, receita da plataforma e compromissos com organizadores.
				</p>
			</header>
			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<PlatformMetricCard
					label="Volume processado"
					value={currency.format(gross)}
					helper={`${succeeded.length} transações confirmadas`}
					icon={CircleDollarSign}
					tone="emerald"
				/>
				<PlatformMetricCard
					label="Receita da plataforma"
					value={currency.format(platform)}
					helper="Taxas de serviço reconhecidas"
					icon={Banknote}
				/>
				<PlatformMetricCard
					label="Custo do gateway"
					value={currency.format(provider)}
					helper="Tarifas informadas pelo provedor"
					icon={ReceiptText}
					tone="amber"
				/>
				<PlatformMetricCard
					label="Líquido dos organizadores"
					value={currency.format(net)}
					helper="Antes dos repasses já realizados"
					icon={WalletCards}
					tone="blue"
				/>
			</section>
			<PayoutCreationPanel organizers={enabledOrganizers} />
			<section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
				<Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
					<div className="border-b border-border p-5">
						<h2 className="font-semibold">Conciliação de transações</h2>
						<p className="text-xs text-muted-foreground">Valores brutos, tarifas e líquido por venda.</p>
					</div>
					<div className="max-h-[620px] overflow-auto">
						<Table className="w-full text-left text-sm">
							<TableHeader className="sticky top-0 bg-muted/40 text-xs uppercase text-muted-foreground">
								<TableRow>
									<TableHead className="px-5 py-3">Operação</TableHead>
									<TableHead className="px-5 py-3">Organizador</TableHead>
									<TableHead className="px-5 py-3 text-right">Bruto</TableHead>
									<TableHead className="px-5 py-3 text-right">Gateway</TableHead>
									<TableHead className="px-5 py-3 text-right">Líquido</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className="divide-y divide-border">
								{transactions.data.map((item) => (
									<TableRow key={item.id}>
										<TableCell className="px-5 py-4">
											<p className="font-medium">{item.registration_id?.event_id?.title ?? 'Evento'}</p>
											<p className="text-xs text-muted-foreground">
												{item.registration_id?.participant_name ?? '—'} · {item.status}
											</p>
										</TableCell>
										<TableCell className="px-5 py-4 text-muted-foreground">
											{item.registration_id?.event_id?.organizer_id?.name ?? '—'}
										</TableCell>
										<TableCell className="px-5 py-4 text-right font-medium">
											{currency.format(Number(item.amount ?? 0))}
										</TableCell>
										<TableCell className="px-5 py-4 text-right text-amber-700">
											-{currency.format(Number(item.provider_fee ?? 0))}
										</TableCell>
										<TableCell className="px-5 py-4 text-right font-semibold text-emerald-700">
											{currency.format(Number(item.organizer_net ?? 0))}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						{!transactions.data.length && (
							<p className="p-10 text-center text-sm text-muted-foreground">Nenhuma transação.</p>
						)}
					</div>
				</Card>
				<Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
					<div className="border-b border-border p-5">
						<h2 className="font-semibold">Repasses recentes</h2>
						<p className="text-xs text-muted-foreground">Histórico de transferências PIX.</p>
					</div>
					<div className="divide-y divide-border">
						{payouts.data.map((payout) => (
							<div key={payout.id} className="p-5">
								<div className="flex items-center justify-between gap-3">
									<p className="font-medium">{payout.organizer_id?.name ?? 'Organizador'}</p>
									<Badge variant="secondary" className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
										{payout.status}
									</Badge>
								</div>
								<p className="mt-2 text-lg font-bold">{currency.format(Number(payout.amount))}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{new Date(payout.requested_at).toLocaleString('pt-BR')}
								</p>
							</div>
						))}
						{!payouts.data.length && (
							<p className="p-10 text-center text-sm text-muted-foreground">Nenhum repasse realizado.</p>
						)}
					</div>
				</Card>
			</section>
		</div>
	);
}
