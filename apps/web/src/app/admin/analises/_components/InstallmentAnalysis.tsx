import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Clock, XCircle, CheckCircle2 } from 'lucide-react'
import type { InstallmentData, InstallmentAlert } from '../actions'

interface InstallmentAnalysisProps {
  summary: InstallmentData[]
  alerts: InstallmentAlert[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
  active: 'Ativo',
  completed: 'Completo',
  defaulted: 'Inadimplente'
}

export function InstallmentAnalysis({ summary, alerts }: InstallmentAnalysisProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const totalAmount = summary.reduce((sum, item) => sum + item.totalAmount, 0)
  const receivedAmount = summary.reduce((sum, item) => sum + item.receivedAmount, 0)
  const pendingAmount = summary.reduce((sum, item) => sum + item.pendingAmount, 0)

  const receivedPercentage = totalAmount > 0 ? (receivedAmount / totalAmount) * 100 : 0

  // Alertas críticos
  const overdueAlert = alerts.find(a => a.type === 'overdue')
  const upcomingAlert = alerts.find(a => a.type === 'upcoming')
  const defaultedAlert = alerts.find(a => a.type === 'defaulted')

  const hasAlerts = (overdueAlert?.count || 0) > 0 ||
                    (upcomingAlert?.count || 0) > 0 ||
                    (defaultedAlert?.count || 0) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Parcelamentos (Pix)</CardTitle>
        <CardDescription>
          Acompanhamento de pagamentos parcelados via Pix
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs de parcelamento */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950">
            <p className="text-sm text-muted-foreground">Recebido</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(receivedAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {receivedPercentage.toFixed(1)}% do total
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950">
            <p className="text-sm text-muted-foreground">A Receber</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </p>
          </div>
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
                  {defaultedAlert.count} plano{defaultedAlert.count > 1 ? 's' : ''} de parcelamento
                  inadimplente{defaultedAlert.count > 1 ? 's' : ''} - Valor afetado:{' '}
                  <span className="font-semibold">{formatCurrency(defaultedAlert.amount)}</span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Tabela de resumo por status */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Resumo por Status</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum parcelamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.map((item) => {
                    const getStatusIcon = (status: string) => {
                      switch (status) {
                        case 'paid':
                        case 'completed':
                          return <CheckCircle2 className="size-4 text-green-600" />
                        case 'overdue':
                        case 'defaulted':
                          return <XCircle className="size-4 text-red-600" />
                        case 'pending':
                        case 'active':
                          return <Clock className="size-4 text-yellow-600" />
                        default:
                          return null
                      }
                    }

                    const getStatusVariant = (status: string): any => {
                      switch (status) {
                        case 'paid':
                        case 'completed':
                          return 'default'
                        case 'overdue':
                        case 'defaulted':
                          return 'destructive'
                        case 'pending':
                        case 'active':
                          return 'secondary'
                        default:
                          return 'outline'
                      }
                    }

                    return (
                      <TableRow key={item.status}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <Badge variant={getStatusVariant(item.status)}>
                              {STATUS_LABELS[item.status] || item.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(item.receivedAmount)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600 font-semibold">
                          {formatCurrency(item.pendingAmount)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Indicador de saúde financeira */}
        {summary.length > 0 && (
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Saúde Financeira dos Parcelamentos</p>
              <Badge variant={receivedPercentage >= 80 ? 'default' : receivedPercentage >= 50 ? 'secondary' : 'destructive'}>
                {receivedPercentage >= 80 ? 'Excelente' : receivedPercentage >= 50 ? 'Moderado' : 'Crítico'}
              </Badge>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  receivedPercentage >= 80
                    ? 'bg-green-600'
                    : receivedPercentage >= 50
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${receivedPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {receivedPercentage.toFixed(1)}% do valor total já foi recebido
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
