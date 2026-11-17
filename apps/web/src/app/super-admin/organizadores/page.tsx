import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchPlatformOrganizers } from '@/features/super-admin/api/server';
import { OrganizerStatusActions } from '@/features/super-admin/components/OrganizerStatusActions';
import { Building2, Search, TicketCheck } from 'lucide-react';

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
			<header>
				<p className="text-sm font-semibold text-primary">Governança</p>
				<h1 className="mt-1 text-3xl font-bold tracking-tight">Organizadores</h1>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
					Ative contas, valide dados PIX e acompanhe o volume de cada operação.
				</p>
			</header>
			<form className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Buscar organizadores"
						name="search"
						defaultValue={params.search}
						className="pl-9"
						placeholder="Buscar por nome ou e-mail"
					/>
				</div>
				<NativeSelect
					aria-label="Status do organizador"
					name="status"
					defaultValue={params.status ?? ''}
					className="h-10 rounded-md border border-border bg-card px-3 text-sm"
				>
					<NativeSelectOption value="">Todos os status</NativeSelectOption>
					<NativeSelectOption value="active">Ativos</NativeSelectOption>
					<NativeSelectOption value="pending">Pendentes</NativeSelectOption>
					<NativeSelectOption value="archived">Arquivados</NativeSelectOption>
				</NativeSelect>
				<Button type="submit">Filtrar</Button>
			</form>
			<Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
				<div className="flex items-center justify-between border-b border-border px-5 py-4">
					<div>
						<h2 className="font-semibold">{result.pagination.total} organizador(es)</h2>
						<p className="text-xs text-muted-foreground">Alterações de status ficam registradas na auditoria.</p>
					</div>
					<Building2 className="size-5 text-muted-foreground" />
				</div>
				<div className="overflow-x-auto">
					<Table className="w-full text-left text-sm">
						<TableHeader className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
							<TableRow>
								<TableHead className="px-5 py-3">Organizador</TableHead>
								<TableHead className="px-5 py-3">Operação</TableHead>
								<TableHead className="px-5 py-3">Receita bruta</TableHead>
								<TableHead className="px-5 py-3">Controles</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="divide-y divide-border">
							{result.data.map((organizer) => (
								<TableRow key={organizer.id} className="align-top hover:bg-muted/40">
									<TableCell className="px-5 py-4">
										<p className="font-semibold text-foreground">{organizer.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">{organizer.email}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											Desde {new Date(organizer.date_created).toLocaleDateString('pt-BR')}
										</p>
									</TableCell>
									<TableCell className="px-5 py-4">
										<div className="flex items-center gap-2 text-foreground">
											<TicketCheck className="size-4 text-primary" />
											{organizer.metrics.ticketsSold} ingressos
										</div>
										<p className="mt-1 text-xs text-muted-foreground">{organizer.metrics.events} eventos</p>
									</TableCell>
									<TableCell className="px-5 py-4 font-semibold">
										{currency.format(organizer.metrics.grossRevenue)}
									</TableCell>
									<TableCell className="px-5 py-4">
										<OrganizerStatusActions
											id={organizer.id}
											status={organizer.status}
											payoutStatus={organizer.payout_status ?? 'not_configured'}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{!result.data.length && (
						<div className="p-12 text-center">
							<Building2 className="mx-auto size-8 text-slate-300" />
							<p className="mt-3 text-sm text-muted-foreground">Nenhum organizador encontrado.</p>
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}
