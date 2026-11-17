import { RecordTable } from '@/components/ui/record-table';

import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Card } from '@/components/ui/card';
import { QueryFilterSheet } from '@/components/shared/QueryFilterSheet';
import { Building2, TicketCheck } from 'lucide-react';
import { fetchPlatformOrganizers } from '@/features/super-admin/api/server';
import { OrganizerStatusActions } from '@/features/super-admin/components/OrganizerStatusActions';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function OrganizersPage({
	searchParams,
}: {
	searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
	const params = await searchParams;
	const query = new URLSearchParams();
	if (params.search) query.set('search', params.search);
	if (params.status) query.set('status', params.status);
	if (params.page) query.set('page', params.page);
	const result = await fetchPlatformOrganizers(query.toString());

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Governança"
				title="Organizadores"
				description={<> Ative contas, valide dados PIX e acompanhe o volume de cada operação. </>}
			/>
			<QueryFilterSheet
				title="Filtros de organizadores"
				fields={[
					{ name: 'search', label: 'Buscar organizadores', type: 'search', placeholder: 'Buscar por nome ou e-mail' },
					{
						name: 'status',
						label: 'Status',
						type: 'select',
						options: [
							{ value: '', label: 'Todos os status' },
							{ value: 'active', label: 'Ativos' },
							{ value: 'pending', label: 'Pendentes' },
							{ value: 'archived', label: 'Arquivados' },
						],
					},
				]}
			/>
			<Card className="overflow-hidden">
				<div className="flex items-center justify-between border-b border-border px-5 py-4">
					<div>
						<h2 className="font-semibold">{result.pagination.total} organizador(es)</h2>
						<p className="text-xs text-muted-foreground">Alterações de status ficam registradas na auditoria.</p>
					</div>
					<Building2 className="size-5 text-muted-foreground" />
				</div>
				<div className="overflow-x-auto">
					<RecordTable
						headers={['Organizador', 'Operação', 'Receita bruta', 'Controles']}
						rows={result.data.map((organizer) => ({
							id: String(organizer.id),
							cells: [
								<div key="column-0">
									<p className="font-semibold text-foreground">{organizer.name}</p>
									<p className="mt-1 text-xs text-muted-foreground">{organizer.email}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Desde {new Date(organizer.date_created).toLocaleDateString('pt-BR')}
									</p>
								</div>,
								<div key="column-1">
									<div className="flex items-center gap-2 text-foreground">
										<TicketCheck className="size-4 text-primary" />
										{organizer.metrics.ticketsSold} ingressos
									</div>
									<p className="mt-1 text-xs text-muted-foreground">{organizer.metrics.events} eventos</p>
								</div>,
								<div key="column-2">{currency.format(organizer.metrics.grossRevenue)}</div>,
								<div key="column-3">
									<OrganizerStatusActions
										id={organizer.id}
										status={organizer.status}
										payoutStatus={organizer.payout_status ?? 'not_configured'}
									/>
								</div>,
							],
						}))}
						paginate={false}
						emptyMessage={undefined}
					/>
					{!result.data.length && (
						<div className="p-12 text-center">
							<Building2 className="mx-auto size-8 text-muted-foreground" />
							<p className="mt-3 text-sm text-muted-foreground">Nenhum organizador encontrado.</p>
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}
