'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { PaymentStatusData } from '../actions'

interface PaymentStatusDonutProps {
  data: PaymentStatusData[]
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#10b981', // green
  paid: '#10b981',      // green
  pending: '#f59e0b',   // yellow
  partial_payment: '#f97316', // orange
  payment_overdue: '#ef4444', // red
  cancelled: '#6b7280', // gray
  checked_in: '#3b82f6' // blue
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  paid: 'Pago',
  pending: 'Pendente',
  partial_payment: 'Pagamento Parcial',
  payment_overdue: 'Atrasado',
  cancelled: 'Cancelado',
  checked_in: 'Check-in Feito'
}

export function PaymentStatusDonut({ data }: PaymentStatusDonutProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    amount: item.value,
    percentage: item.percentage,
    fill: STATUS_COLORS[item.status] || '#6b7280'
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Quantidade:</span> {data.value}</p>
            <p><span className="text-muted-foreground">Valor:</span> {formatCurrency(data.amount)}</p>
            <p><span className="text-muted-foreground">Percentual:</span> {data.percentage.toFixed(1)}%</p>
          </div>
        </div>
      )
    }
    
return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.value} ({chartData[index].value})
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status dos Pagamentos</CardTitle>
        <CardDescription>
          Distribuição dos status das inscrições
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
