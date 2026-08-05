'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { CheckinHourData } from '../actions'

interface CheckinHeatmapProps {
  data: CheckinHourData[]
}

export function CheckinHeatmap({ data }: CheckinHeatmapProps) {
  const getBarColor = (percentage: number) => {
    if (percentage >= 30) return '#10b981' // green
    if (percentage >= 15) return '#f59e0b' // yellow
    
return '#3b82f6' // blue
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Check-ins:</span>{' '}
            <span className="font-semibold">{payload[0].value}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Percentual:</span>{' '}
            <span className="font-semibold">{payload[0].payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    
return null
  }

  // Encontrar pico de check-ins
  const peakHour = data.length > 0
    ? data.reduce((prev, curr) => curr.count > prev.count ? curr : prev)
    : null

  const totalCheckins = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Calor - Check-ins por Horário</CardTitle>
        <CardDescription>
          Distribuição de check-ins ao longo do dia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum check-in registrado ainda
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">Total de Check-ins</p>
                <p className="text-2xl font-bold">{totalCheckins}</p>
              </div>
              {peakHour && (
                <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950">
                  <p className="text-sm text-muted-foreground">Horário de Pico</p>
                  <p className="text-2xl font-bold text-green-600">{peakHour.hour}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {peakHour.count} check-ins ({peakHour.percentage.toFixed(1)}%)
                  </p>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Check-ins', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legenda de cores */}
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-green-600" />
                <span className="text-muted-foreground">Alta demanda (&gt;30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-yellow-600" />
                <span className="text-muted-foreground">Média demanda (15-30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-blue-600" />
                <span className="text-muted-foreground">Baixa demanda (&lt;15%)</span>
              </div>
            </div>

            {/* Insights */}
            {peakHour && (
              <div className="mt-4 rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">💡 Insights</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Prepare staff adicional próximo ao horário de pico ({peakHour.hour})</li>
                  <li>• Considere abrir portões com antecedência para evitar filas</li>
                  <li>• {peakHour.percentage > 40 ? 'Alta concentração de chegadas - reforce a equipe' : 'Distribuição relativamente uniforme'}</li>
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
