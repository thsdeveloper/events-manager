'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PaymentMethodData } from '../actions'
import { CreditCard, QrCode, Receipt, Gift } from 'lucide-react'

interface PaymentMethodsChartProps {
  data: PaymentMethodData[]
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Cartão',
  pix: 'Pix',
  boleto: 'Boleto',
  free: 'Gratuito',
  unknown: 'Não identificado'
}

const METHOD_ICONS: Record<string, any> = {
  card: CreditCard,
  pix: QrCode,
  boleto: Receipt,
  free: Gift
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value)
  }

  const chartData = data.map(item => ({
    method: METHOD_LABELS[item.method] || item.method,
    count: item.count,
    revenue: item.revenue
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">Transações:</span> {payload[0].value}
            </p>
            <p className="text-green-600">
              <span className="font-medium">Receita:</span> {formatCurrency(payload[1].value)}
            </p>
          </div>
        </div>
      )
    }
    
return null
  }

  // Calcular totais
  const totalTransactions = data.reduce((sum, item) => sum + item.count, 0)
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos de Pagamento</CardTitle>
        <CardDescription>
          Volume de transações e receita por método de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Total de Transações</p>
            <p className="text-2xl font-bold">{totalTransactions}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="method"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="Transações"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="revenue"
              name="Receita (R$)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {data.map((item) => {
            const Icon = METHOD_ICONS[item.method] || CreditCard
            const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0

            return (
              <div
                key={item.method}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="rounded-full bg-primary/10 p-2">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {METHOD_LABELS[item.method] || item.method}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% da receita
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
