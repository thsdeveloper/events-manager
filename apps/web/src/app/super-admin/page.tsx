import { getPlatformPermissions } from '@/features/platform-access/server';
import { canVisitPlatformPath, preferredPlatformPath } from '@/features/platform-access/policy';
import { redirect } from 'next/navigation';
import { RecordTable } from '@/components/ui/record-table';

import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { PlatformOverviewCharts } from '@/features/super-admin/components/PlatformOverviewCharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, Building2, CircleDollarSign, WalletCards } from 'lucide-react';
import { PlatformMetricCard } from '@/features/super-admin/components/PlatformMetricCard';
import { fetchPlatformOverview } from '@/features/super-admin/api/server';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export default async function SuperAdminOverviewPage() {
	const access = await getPlatformPermissions();
	if (!canVisitPlatformPath(access, '/super-admin')) redirect(preferredPlatformPath(access));

	const data = await fetchPlatformOverview();

	return (
		<div className="space-y-8">
			<PageHeader
				eyebrow="Visão geral"
				title="Saúde do ecossistema"
				description="Receita, operação e valores a repassar consolidados em uma única visão."
				actions={
					<div
						className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${data.provider === 'mock' ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'}`}
					>
						{data.provider === 'mock' ? 'Gateway em simulação local' : 'AbacatePay conectado'}
					</div>
				}
			/>
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
			<PlatformOverviewCharts data={data} />
			<Card className="">
				<div className="border-b border-border p-6">
					<h2 className="font-semibold">Transações recentes</h2>
					<p className="mt-1 text-sm text-muted-foreground">Últimas confirmações e movimentações do gateway.</p>
				</div>
				<div className="overflow-x-auto">
					<RecordTable
						headers={['Participante', 'Evento', 'Organizador', 'Status', 'Valor']}
						rows={data.recentTransactions.map((transaction) => ({
							id: String(transaction.id),
							cells: [
								<div key="column-0" className="font-medium">
									{transaction.registration_id?.participant_name ?? '—'}
								</div>,
								<div key="column-1" className="text-muted-foreground">
									{transaction.registration_id?.event_id?.title ?? '—'}
								</div>,
								<div key="column-2" className="text-muted-foreground">
									{transaction.registration_id?.event_id?.organizer_id?.name ?? '—'}
								</div>,
								<div key="column-3">
									<Badge variant="secondary">{transaction.status}</Badge>
								</div>,
								<div key="column-4" className="text-right">
									{currency.format(Number(transaction.amount ?? 0))}
								</div>,
							],
						}))}
						paginate={false}
						emptyMessage={undefined}
					/>
					{!data.recentTransactions.length && (
						<p className="p-10 text-center text-sm text-muted-foreground">Nenhuma transação registrada.</p>
					)}
				</div>
			</Card>
		</div>
	);
}
