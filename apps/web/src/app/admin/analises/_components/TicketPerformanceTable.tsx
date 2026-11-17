import { RecordTable } from '@/components/ui/record-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { TicketPerformance } from '../actions';

interface TicketPerformanceTableProps {
	data: TicketPerformance[];
}

export function TicketPerformanceTable({ data }: TicketPerformanceTableProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(value);
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, { variant: any; label: string }> = {
			active: { variant: 'default', label: 'Ativo' },
			sold_out: { variant: 'destructive', label: 'Esgotado' },
			inactive: { variant: 'secondary', label: 'Inativo' },
		};

		const config = variants[status] || { variant: 'secondary', label: status };

		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getSellRateColor = (rate: number) => {
		if (rate >= 80) return 'text-muted-foreground';
		if (rate >= 50) return 'text-muted-foreground';

		return 'text-destructive';
	};

	const totalRevenue = data.reduce((sum, ticket) => sum + ticket.revenue, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Performance por Tipo de Ingresso</CardTitle>
				<CardDescription>Análise detalhada de vendas por categoria de ingresso</CardDescription>
			</CardHeader>
			<CardContent>
				<Card className="mb-4 p-4">
					<p className="text-sm text-muted-foreground">Receita Total de Ingressos</p>
					<p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
				</Card>

				<Card className="">
					<RecordTable
						headers={['Tipo de Ingresso', 'Vendas', 'Estoque', 'Receita', 'Taxa Conv.', 'Status']}
						rows={data.map((ticket) => {
							const sellRate = ticket.total > 0 ? (ticket.sold / ticket.total) * 100 : 0;
							const revenuePercentage = totalRevenue > 0 ? (ticket.revenue / totalRevenue) * 100 : 0;

							return {
								id: String(ticket.id),
								values: [
									ticket.title,
									ticket.sold,
									ticket.total - ticket.sold,
									ticket.revenue,
									ticket.conversionRate,
									ticket.status,
								],
								cells: [
									<div key="column-0" className="font-medium">
										{ticket.title}
										{revenuePercentage > 0 && (
											<p className="text-xs text-muted-foreground mt-1">
												{revenuePercentage.toFixed(1)}% da receita total
											</p>
										)}
									</div>,
									<div key="column-1" className="text-center">
										<div className="flex flex-col items-center gap-1">
											<span className="font-semibold">
												{ticket.sold} / {ticket.total}
											</span>
											<Progress value={sellRate} className="h-1.5 w-20" />
										</div>
									</div>,
									<div key="column-2" className="text-center">
										<span className={getSellRateColor(sellRate)}>{sellRate.toFixed(0)}%</span>
									</div>,
									<div key="column-3" className="text-right">
										{formatCurrency(ticket.revenue)}
									</div>,
									<div key="column-4" className="text-center">
										<span className={getSellRateColor(ticket.conversionRate)}>{ticket.conversionRate.toFixed(1)}%</span>
									</div>,
									<div key="column-5" className="text-center">
										{getStatusBadge(ticket.status)}
									</div>,
								],
							};
						})}
						paginate={true}
						emptyMessage={<>Nenhum ingresso encontrado</>}
					/>
				</Card>

				{data.length > 0 && (
					<div className="mt-4 grid grid-cols-3 gap-4 text-sm">
						<Card className="p-3">
							<p className="text-muted-foreground">Melhor Performance</p>
							<p className="font-semibold mt-1">
								{data.reduce((prev, curr) => (curr.conversionRate > prev.conversionRate ? curr : prev)).title}
							</p>
						</Card>
						<Card className="p-3">
							<p className="text-muted-foreground">Maior Receita</p>
							<p className="font-semibold mt-1">
								{data.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev)).title}
							</p>
						</Card>
						<Card className="p-3">
							<p className="text-muted-foreground">Mais Vendido</p>
							<p className="font-semibold mt-1">
								{data.reduce((prev, curr) => (curr.sold > prev.sold ? curr : prev)).title}
							</p>
						</Card>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
