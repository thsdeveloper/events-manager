import { RecordTable } from '@/components/ui/record-table';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import type { InstallmentData, InstallmentAlert } from '../actions';

interface InstallmentAnalysisProps {
	summary: InstallmentData[];
	alerts: InstallmentAlert[];
}

const STATUS_LABELS: Record<string, string> = {
	pending: 'Pendente',
	paid: 'Pago',
	overdue: 'Atrasado',
	cancelled: 'Cancelado',
	active: 'Ativo',
	completed: 'Completo',
	defaulted: 'Inadimplente',
};

export function InstallmentAnalysis({ summary, alerts }: InstallmentAnalysisProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(value);
	};

	const totalAmount = summary.reduce((sum, item) => sum + item.totalAmount, 0);
	const receivedAmount = summary.reduce((sum, item) => sum + item.receivedAmount, 0);
	const pendingAmount = summary.reduce((sum, item) => sum + item.pendingAmount, 0);

	const receivedPercentage = totalAmount > 0 ? (receivedAmount / totalAmount) * 100 : 0;

	// Alertas críticos
	const overdueAlert = alerts.find((a) => a.type === 'overdue');
	const upcomingAlert = alerts.find((a) => a.type === 'upcoming');
	const defaultedAlert = alerts.find((a) => a.type === 'defaulted');

	const hasAlerts =
		(overdueAlert?.count || 0) > 0 || (upcomingAlert?.count || 0) > 0 || (defaultedAlert?.count || 0) > 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Análise de Parcelamentos (Pix)</CardTitle>
				<CardDescription>Acompanhamento de pagamentos parcelados via Pix</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* KPIs de parcelamento */}
				<div className="grid grid-cols-3 gap-4">
					<Card className="p-4">
						<p className="text-sm text-muted-foreground">Total</p>
						<p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
					</Card>
					<Card className="p-4">
						<p className="text-sm text-muted-foreground">Recebido</p>
						<p className="text-2xl font-bold text-muted-foreground">{formatCurrency(receivedAmount)}</p>
						<p className="text-xs text-muted-foreground mt-1">{receivedPercentage.toFixed(1)}% do total</p>
					</Card>
					<Card className="p-4">
						<p className="text-sm text-muted-foreground">A Receber</p>
						<p className="text-2xl font-bold text-muted-foreground">{formatCurrency(pendingAmount)}</p>
					</Card>
				</div>

				{/* Alertas */}
				{hasAlerts && (
					<div className="space-y-2">
						{overdueAlert && overdueAlert.count > 0 && (
							<Alert variant="destructive">
								<XCircle className="size-4" />
								<AlertTitle>Parcelas Vencidas</AlertTitle>
								<AlertDescription>
									{overdueAlert.count} parcela{overdueAlert.count > 1 ? 's' : ''} vencida
									{overdueAlert.count > 1 ? 's' : ''} no valor de{' '}
									<span className="font-semibold">{formatCurrency(overdueAlert.amount)}</span>
								</AlertDescription>
							</Alert>
						)}

						{upcomingAlert && upcomingAlert.count > 0 && (
							<Alert>
								<Clock className="size-4" />
								<AlertTitle>Parcelas com Vencimento Próximo</AlertTitle>
								<AlertDescription>
									{upcomingAlert.count} parcela{upcomingAlert.count > 1 ? 's' : ''} vence
									{upcomingAlert.count > 1 ? 'm' : ''} nos próximos 7 dias - Total:{' '}
									<span className="font-semibold">{formatCurrency(upcomingAlert.amount)}</span>
								</AlertDescription>
							</Alert>
						)}

						{defaultedAlert && defaultedAlert.count > 0 && (
							<Alert variant="destructive">
								<AlertTriangle className="size-4" />
								<AlertTitle>Planos Inadimplentes</AlertTitle>
								<AlertDescription>
									{defaultedAlert.count} plano{defaultedAlert.count > 1 ? 's' : ''} de parcelamento inadimplente
									{defaultedAlert.count > 1 ? 's' : ''} - Valor afetado:{' '}
									<span className="font-semibold">{formatCurrency(defaultedAlert.amount)}</span>
								</AlertDescription>
							</Alert>
						)}
					</div>
				)}

				{/* Tabela de resumo por status */}
				<div>
					<h4 className="text-sm font-semibold mb-2">Resumo por Status</h4>
					<Card className="">
						<RecordTable
							headers={['Status', 'Quantidade', 'Total', 'Recebido', 'Pendente']}
							rows={summary.map((item) => {
								const getStatusIcon = (status: string) => {
									switch (status) {
										case 'paid':
										case 'completed':
											return <CheckCircle2 className="size-4 text-muted-foreground" />;
										case 'overdue':
										case 'defaulted':
											return <XCircle className="size-4 text-destructive" />;
										case 'pending':
										case 'active':
											return <Clock className="size-4 text-muted-foreground" />;
										default:
											return null;
									}
								};

								const getStatusVariant = (status: string): any => {
									switch (status) {
										case 'paid':
										case 'completed':
											return 'default';
										case 'overdue':
										case 'defaulted':
											return 'destructive';
										case 'pending':
										case 'active':
											return 'secondary';
										default:
											return 'outline';
									}
								};

								return {
									id: String(item.status),
									values: [item.status, item.count, item.totalAmount, item.receivedAmount, item.pendingAmount],
									cells: [
										<div key="column-0">
											<div className="flex items-center gap-2">
												{getStatusIcon(item.status)}
												<Badge variant={getStatusVariant(item.status)}>
													{STATUS_LABELS[item.status] || item.status}
												</Badge>
											</div>
										</div>,
										<div key="column-1" className="text-center">
											{item.count}
										</div>,
										<div key="column-2" className="text-right">
											{formatCurrency(item.totalAmount)}
										</div>,
										<div key="column-3" className="text-right text-muted-foreground">
											{formatCurrency(item.receivedAmount)}
										</div>,
										<div key="column-4" className="text-right text-muted-foreground">
											{formatCurrency(item.pendingAmount)}
										</div>,
									],
								};
							})}
							paginate={true}
							emptyMessage={<>Nenhum parcelamento encontrado</>}
						/>
					</Card>
				</div>

				{/* Indicador de saúde financeira */}
				{summary.length > 0 && (
					<Card className="p-4">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm font-medium">Saúde Financeira dos Parcelamentos</p>
							<Badge
								variant={receivedPercentage >= 80 ? 'default' : receivedPercentage >= 50 ? 'secondary' : 'destructive'}
							>
								{receivedPercentage >= 80 ? 'Excelente' : receivedPercentage >= 50 ? 'Moderado' : 'Crítico'}
							</Badge>
						</div>
						<Progress value={receivedPercentage} aria-label="Valor recebido dos parcelamentos" className="h-2" />
						<p className="text-xs text-muted-foreground mt-2">
							{receivedPercentage.toFixed(1)}% do valor total já foi recebido
						</p>
					</Card>
				)}
			</CardContent>
		</Card>
	);
}
