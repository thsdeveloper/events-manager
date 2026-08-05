import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { TicketPerformance } from '../actions'

interface TicketPerformanceTableProps {
  data: TicketPerformance[]
}

export function TicketPerformanceTable({ data }: TicketPerformanceTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      sold_out: { variant: 'destructive', label: 'Esgotado' },
      inactive: { variant: 'secondary', label: 'Inativo' }
    }

    const config = variants[status] || { variant: 'secondary', label: status }

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getSellRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 50) return 'text-yellow-600'
    
return 'text-red-600'
  }

  const totalRevenue = data.reduce((sum, ticket) => sum + ticket.revenue, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Tipo de Ingresso</CardTitle>
        <CardDescription>
          Análise detalhada de vendas por categoria de ingresso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg border p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">Receita Total de Ingressos</p>
          <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Ingresso</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-center">Taxa Conv.</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum ingresso encontrado
                  </TableCell>
                </TableRow>
              ) : (
                data.map((ticket) => {
                  const sellRate = ticket.total > 0 ? (ticket.sold / ticket.total) * 100 : 0
                  const revenuePercentage = totalRevenue > 0 ? (ticket.revenue / totalRevenue) * 100 : 0

                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        {ticket.title}
                        {revenuePercentage > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {revenuePercentage.toFixed(1)}% da receita total
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold">
                            {ticket.sold} / {ticket.total}
                          </span>
                          <Progress
                            value={sellRate}
                            className="h-1.5 w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getSellRateColor(sellRate)}>
                          {sellRate.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(ticket.revenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getSellRateColor(ticket.conversionRate)}>
                          {ticket.conversionRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Melhor Performance</p>
              <p className="font-semibold mt-1">
                {data.reduce((prev, curr) =>
                  curr.conversionRate > prev.conversionRate ? curr : prev
                ).title}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Maior Receita</p>
              <p className="font-semibold mt-1">
                {data.reduce((prev, curr) =>
                  curr.revenue > prev.revenue ? curr : prev
                ).title}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Mais Vendido</p>
              <p className="font-semibold mt-1">
                {data.reduce((prev, curr) =>
                  curr.sold > prev.sold ? curr : prev
                ).title}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
