import { hasPlatformPermission } from '@events-manager/contracts';
import { getPlatformPermissions, canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import Link from 'next/link';
import { RecordTable } from '@/components/ui/record-table';

import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react';
import {
	fetchPlatformOrganizers,
	fetchPlatformPayouts,
	fetchPlatformTransactions,
} from '@/features/super-admin/api/server';
import { PlatformMetricCard } from '@/features/super-admin/components/PlatformMetricCard';
import { PayoutCreationPanel } from '@/features/super-admin/components/PayoutCreationPanel';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function PlatformFinancePage() {
	if (!(await canOpenPlatformPage('/super-admin/financeiro'))) return <AccessDenied scope="platform" />;

	const access = await getPlatformPermissions();
	const execute =
		hasPlatformPermission(access, 'platform_payouts.execute') &&
		hasPlatformPermission(access, 'platform_organizers.read');
	const [transactions, payouts, organizers] = await Promise.all([
		fetchPlatformTransactions(),
		fetchPlatformPayouts(),
		execute ? fetchPlatformOrganizers('limit=100&status=active') : Promise.resolve({ data: [] }),
	]);
	const succeeded = transactions.data.filter((item) => item.status === 'succeeded');
	const gross = succeeded.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
	const platform = succeeded.reduce((sum, item) => sum + Number(item.platform_fee ?? 0), 0);
	const provider = succeeded.reduce((sum, item) => sum + Number(item.provider_fee ?? 0), 0);
	const net = succeeded.reduce((sum, item) => sum + Number(item.organizer_net ?? 0), 0);
	const enabledOrganizers = organizers.data
		.filter((item) => item.payout_status === 'enabled')
		.map((item) => ({ id: item.id, name: item.name, method: item.receiving_method }));

	return (
		<div className="space-y-8">
			<PageHeader
				eyebrow="Financeiro global"
				title="Fluxo financeiro da plataforma"
				description={
					<> Conciliação de vendas, tarifas do gateway, receita da plataforma e compromissos com organizadores. </>
				}
			/>
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
			{execute && <PayoutCreationPanel organizers={enabledOrganizers} />}
			<section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
				<Card className="overflow-hidden">
					<div className="border-b border-border p-5">
						<h2 className="font-semibold">Conciliação de transações</h2>
						<p className="text-xs text-muted-foreground">Valores brutos, tarifas e líquido por venda.</p>
					</div>
					<div className="max-h-[620px] overflow-auto">
						<RecordTable
							headers={['Operação', 'Organizador', 'Bruto', 'Gateway', 'Líquido']}
							rows={transactions.data.map((item) => ({
								id: String(item.id),
								cells: [
									<div key="column-0">
										<p className="font-medium">{item.registration_id?.event_id?.title ?? 'Evento'}</p>
										<p className="text-xs text-muted-foreground">
											{item.registration_id?.participant_name ?? '—'} · {item.status}
										</p>
									</div>,
									<div key="column-1" className="text-muted-foreground">
										{item.registration_id?.event_id?.organizer_id?.name ?? '—'}
									</div>,
									<div key="column-2" className="text-right font-medium">
										{currency.format(Number(item.amount ?? 0))}
									</div>,
									<div key="column-3" className="text-right text-muted-foreground">
										-{currency.format(Number(item.provider_fee ?? 0))}
									</div>,
									<div key="column-4" className="text-right text-muted-foreground">
										{currency.format(Number(item.organizer_net ?? 0))}
									</div>,
								],
							}))}
							paginate={false}
							emptyMessage={undefined}
						/>
						{!transactions.data.length && (
							<p className="p-10 text-center text-sm text-muted-foreground">Nenhuma transação.</p>
						)}
					</div>
				</Card>
				<Card className="overflow-hidden">
					<div className="border-b border-border p-5">
						<h2 className="font-semibold">Repasses recentes</h2>
						<p className="text-xs text-muted-foreground">Histórico de transferências PIX.</p>
					</div>
					<div className="divide-y divide-slate-100">
						{payouts.data.map((payout) => (
							<div key={payout.id} className="p-5">
								<div className="flex items-center justify-between gap-3">
									<p className="font-medium">{payout.organizer_id?.name ?? 'Organizador'}</p>
									<Badge variant="secondary">{payout.status}</Badge>
								</div>
								<p className="mt-2 text-lg font-bold">{currency.format(Number(payout.amount))}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{new Date(payout.requested_at).toLocaleString('pt-BR')}
									{payout.method === 'bank_transfer' && (
										<Link
											className="ml-2 underline"
											href={`/super-admin/organizadores/${payout.organizer_id?.id}?tab=payouts`}
										>
											Gerenciar transferência
										</Link>
									)}
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
