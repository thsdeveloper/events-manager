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
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar, ExternalLink, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { ActiveEvent } from '../actions'

interface ActiveEventsTableProps {
  data: ActiveEvent[]
}

export function ActiveEventsTable({ data }: ActiveEventsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const getStatusBadge = (status: ActiveEvent['status']) => {
    const variants = {
      active: { variant: 'default' as const, label: '🟢 Ativo', color: 'text-green-600' },
      slow: { variant: 'secondary' as const, label: '🟡 Lento', color: 'text-yellow-600' },
      critical: { variant: 'destructive' as const, label: '🔴 Crítico', color: 'text-red-600' }
    }

    const config = variants[status]

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getSellRate = (sold: number, total: number) => {
    return total > 0 ? (sold / total) * 100 : 0
  }

  const totalRevenue = data.reduce((sum, event) => sum + event.revenue, 0)
  const totalTicketsSold = data.reduce((sum, event) => sum + event.ticketsSold, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos com Vendas Ativas</CardTitle>
        <CardDescription>
          Panorama de eventos publicados e performance de vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground">Total de Eventos</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950">
            <p className="text-sm text-muted-foreground">Ingressos Vendidos</p>
            <p className="text-2xl font-bold text-blue-600">{totalTicketsSold}</p>
          </div>
          <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead className="text-center">Data</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum evento ativo no momento
                  </TableCell>
                </TableRow>
              ) : (
                data.map((event) => {
                  const sellRate = getSellRate(event.ticketsSold, event.ticketsTotal)

                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {event.id.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span>{formatDate(event.startDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold">
                            {event.ticketsSold} / {event.ticketsTotal}
                          </span>
                          <Progress
                            value={sellRate}
                            className="h-1.5 w-24"
                          />
                          <span className="text-xs text-muted-foreground">
                            {sellRate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold">
                            {formatCurrency(event.revenue)}
                          </span>
                          {event.ticketsSold > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Média: {formatCurrency(event.revenue / event.ticketsSold)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(event.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <Link href={`/admin/eventos/${event.id}`}>
                              Ver Detalhes
                              <ExternalLink className="ml-1 size-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Resumo de performance */}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="size-4 text-green-600" />
                <p className="text-sm text-muted-foreground">Melhor Evento</p>
              </div>
              <p className="font-semibold text-sm">
                {data.reduce((prev, curr) =>
                  curr.revenue > prev.revenue ? curr : prev
                ).title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(
                  data.reduce((prev, curr) =>
                    curr.revenue > prev.revenue ? curr : prev
                  ).revenue
                )}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="size-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">Próximo Evento</p>
              </div>
              <p className="font-semibold text-sm">
                {data[0]?.title || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data[0] ? formatDate(data[0].startDate) : '-'}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="size-4 text-purple-600" />
                <p className="text-sm text-muted-foreground">Taxa Média de Vendas</p>
              </div>
              <p className="font-semibold text-2xl">
                {(
                  data.reduce((sum, event) => {
                    return sum + getSellRate(event.ticketsSold, event.ticketsTotal)
                  }, 0) / data.length
                ).toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
