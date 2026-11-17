import { RecordTable } from '@/components/ui/record-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, ExternalLink, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import type { ActiveEvent } from '../actions';

interface ActiveEventsTableProps {
	data: ActiveEvent[];
}

export function ActiveEventsTable({ data }: ActiveEventsTableProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(value);
	};

	const formatDate = (dateString: string) => {
		return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
	};

	const getStatusBadge = (status: ActiveEvent['status']) => {
		const variants = {
			active: { variant: 'default' as const, label: '🟢 Ativo', color: 'text-muted-foreground' },
			slow: { variant: 'secondary' as const, label: '🟡 Lento', color: 'text-muted-foreground' },
			critical: { variant: 'destructive' as const, label: '🔴 Crítico', color: 'text-destructive' },
		};

		const config = variants[status];

		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getSellRate = (sold: number, total: number) => {
		return total > 0 ? (sold / total) * 100 : 0;
	};

	const totalRevenue = data.reduce((sum, event) => sum + event.revenue, 0);
	const totalTicketsSold = data.reduce((sum, event) => sum + event.ticketsSold, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Eventos com Vendas Ativas</CardTitle>
				<CardDescription>Panorama de eventos publicados e performance de vendas</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 grid grid-cols-3 gap-4">
					<Card className="p-3">
						<p className="text-sm text-muted-foreground">Total de Eventos</p>
						<p className="text-2xl font-bold">{data.length}</p>
					</Card>
					<Card className="p-3">
						<p className="text-sm text-muted-foreground">Ingressos Vendidos</p>
						<p className="text-2xl font-bold text-muted-foreground">{totalTicketsSold}</p>
					</Card>
					<Card className="p-3">
						<p className="text-sm text-muted-foreground">Receita Total</p>
						<p className="text-2xl font-bold text-muted-foreground">{formatCurrency(totalRevenue)}</p>
					</Card>
				</div>

				<Card className="">
					<RecordTable
						headers={['Evento', 'Data', 'Vendas', 'Receita', 'Status', 'Ações']}
						rows={data.map((event) => {
							const sellRate = getSellRate(event.ticketsSold, event.ticketsTotal);

							return {
								id: String(event.id),
								values: [event.title, event.startDate, event.ticketsSold, event.revenue, event.status, null],
								cells: [
									<div key="column-0">
										<div>
											<p className="font-medium">{event.title}</p>
											<p className="text-xs text-muted-foreground mt-1">ID: {event.id.slice(0, 8)}...</p>
										</div>
									</div>,
									<div key="column-1" className="text-center">
										<div className="flex items-center justify-center gap-1 text-sm">
											<Calendar className="size-3 text-muted-foreground" />
											<span>{formatDate(event.startDate)}</span>
										</div>
									</div>,
									<div key="column-2">
										<div className="flex flex-col items-center gap-1">
											<span className="text-sm font-semibold">
												{event.ticketsSold} / {event.ticketsTotal}
											</span>
											<Progress value={sellRate} className="h-1.5 w-24" />
											<span className="text-xs text-muted-foreground">{sellRate.toFixed(0)}%</span>
										</div>
									</div>,
									<div key="column-3" className="text-right">
										<div className="flex flex-col items-end gap-1">
											<span className="font-semibold">{formatCurrency(event.revenue)}</span>
											{event.ticketsSold > 0 && (
												<span className="text-xs text-muted-foreground">
													Média: {formatCurrency(event.revenue / event.ticketsSold)}
												</span>
											)}
										</div>
									</div>,
									<div key="column-4" className="text-center">
										{getStatusBadge(event.status)}
									</div>,
									<div key="column-5" className="text-center">
										<div className="flex items-center justify-center gap-2">
											<Button size="sm" variant="outline" asChild>
												<Link href={`/admin/eventos/${event.id}`}>
													Ver Detalhes
													<ExternalLink className="ml-1 size-3" />
												</Link>
											</Button>
										</div>
									</div>,
								],
							};
						})}
						paginate={true}
						emptyMessage={<>Nenhum evento ativo no momento</>}
					/>
				</Card>

				{/* Resumo de performance */}
				{data.length > 0 && (
					<div className="mt-4 grid grid-cols-3 gap-4">
						<Card className="p-3">
							<div className="flex items-center gap-2 mb-1">
								<TrendingUp className="size-4 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">Melhor Evento</p>
							</div>
							<p className="font-semibold text-sm">
								{data.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev)).title}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{formatCurrency(data.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev)).revenue)}
							</p>
						</Card>

						<Card className="p-3">
							<div className="flex items-center gap-2 mb-1">
								<Calendar className="size-4 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">Próximo Evento</p>
							</div>
							<p className="font-semibold text-sm">{data[0]?.title || 'N/A'}</p>
							<p className="text-xs text-muted-foreground mt-1">{data[0] ? formatDate(data[0].startDate) : '-'}</p>
						</Card>

						<Card className="p-3">
							<div className="flex items-center gap-2 mb-1">
								<TrendingUp className="size-4 text-primary" />
								<p className="text-sm text-muted-foreground">Taxa Média de Vendas</p>
							</div>
							<p className="font-semibold text-2xl">
								{(
									data.reduce((sum, event) => {
										return sum + getSellRate(event.ticketsSold, event.ticketsTotal);
									}, 0) / data.length
								).toFixed(0)}
								%
							</p>
						</Card>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
