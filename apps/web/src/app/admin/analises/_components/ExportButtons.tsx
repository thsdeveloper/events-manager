'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  KPIData,
  SalesDataPoint,
  PaymentStatusData,
  PaymentMethodData,
  TicketPerformance,
  InstallmentData,
  ActiveEvent
} from '../actions'

interface ExportButtonsProps {
  kpiData: KPIData
  salesData: SalesDataPoint[]
  paymentStatusData: PaymentStatusData[]
  paymentMethodsData: PaymentMethodData[]
  ticketPerformance: TicketPerformance[]
  installmentData: { summary: InstallmentData[]; alerts: any[] }
  activeEvents: ActiveEvent[]
}

export function ExportButtons({
  kpiData,
  salesData,
  paymentStatusData,
  paymentMethodsData,
  ticketPerformance,
  installmentData,
  activeEvents
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          // Escapar valores com vírgula ou aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          
return value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`
    link.click()
  }

  const exportParticipantsCSV = async () => {
    setIsExporting(true)
    try {
      // Simular busca de participantes (na implementação real, fazer fetch dos dados)
      const participantsData = [
        {
          nome: 'Exemplo Participante',
          email: 'exemplo@email.com',
          telefone: '(11) 99999-9999',
          evento: 'Tech Summit 2025',
          ingresso: 'VIP',
          valor: formatCurrency(350),
          status: 'Confirmado',
          checkin: 'Sim',
          data_inscricao: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        }
      ]

      exportToCSV(participantsData, 'participantes')
    } finally {
      setIsExporting(false)
    }
  }

  const exportReportPDF = async () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPosition = 20

      // Cabeçalho
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Relatório de Análises', pageWidth / 2, yPosition, { align: 'center' })

      yPosition += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      )

      yPosition += 15

      // KPIs
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Indicadores Principais (KPIs)', 14, yPosition)
      yPosition += 10

      autoTable(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: [
          ['Receita Total', formatCurrency(kpiData.totalRevenue)],
          ['Ingressos Vendidos', `${kpiData.ticketsSold} / ${kpiData.ticketsTotal}`],
          ['Participantes Únicos', kpiData.uniqueParticipants.toString()],
          ['Taxa de Check-in', `${kpiData.checkinRate.toFixed(1)}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      // Performance de Ingressos
      if (ticketPerformance.length > 0) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Performance por Tipo de Ingresso', 14, yPosition)
        yPosition += 10

        autoTable(doc, {
          startY: yPosition,
          head: [['Tipo', 'Vendas', 'Estoque', 'Receita', 'Taxa Conv.']],
          body: ticketPerformance.map(ticket => [
            ticket.title,
            `${ticket.sold} / ${ticket.total}`,
            `${ticket.total > 0 ? ((ticket.sold / ticket.total) * 100).toFixed(0) : 0}%`,
            formatCurrency(ticket.revenue),
            `${ticket.conversionRate.toFixed(1)}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        })

        yPosition = (doc as any).lastAutoTable.finalY + 15
      }

      // Métodos de Pagamento
      if (paymentMethodsData.length > 0 && yPosition < 250) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Métodos de Pagamento', 14, yPosition)
        yPosition += 10

        autoTable(doc, {
          startY: yPosition,
          head: [['Método', 'Transações', 'Receita']],
          body: paymentMethodsData.map(method => [
            method.method,
            method.count.toString(),
            formatCurrency(method.revenue)
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        })
      }

      // Nova página para eventos ativos
      if (activeEvents.length > 0) {
        doc.addPage()
        yPosition = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Eventos Ativos', 14, yPosition)
        yPosition += 10

        autoTable(doc, {
          startY: yPosition,
          head: [['Evento', 'Data', 'Vendas', 'Receita', 'Status']],
          body: activeEvents.map(event => [
            event.title,
            format(new Date(event.startDate), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
            `${event.ticketsSold} / ${event.ticketsTotal}`,
            formatCurrency(event.revenue),
            event.status === 'active' ? 'Ativo' : event.status === 'slow' ? 'Lento' : 'Crítico'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 }
          }
        })
      }

      // Rodapé em todas as páginas
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      doc.save(`relatorio_completo_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const exportFiscalReport = async () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPosition = 20

      // Cabeçalho
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Relatório Fiscal', pageWidth / 2, yPosition, { align: 'center' })

      yPosition += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Período: ${format(new Date(), 'MMMM yyyy', { locale: ptBR })}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      )

      yPosition += 15

      // Resumo Financeiro
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumo Financeiro', 14, yPosition)
      yPosition += 10

      autoTable(doc, {
        startY: yPosition,
        head: [['Descrição', 'Valor']],
        body: [
          ['Receita Bruta Total', formatCurrency(kpiData.totalRevenue)],
          ['Taxas de Serviço', formatCurrency(kpiData.totalRevenue * 0.05)], // Exemplo: 5%
          ['Receita Líquida', formatCurrency(kpiData.totalRevenue * 0.95)],
          ['Total de Transações', kpiData.ticketsSold.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 139, 34] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      // Breakdown por método de pagamento
      if (paymentMethodsData.length > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Receita por Método de Pagamento', 14, yPosition)
        yPosition += 10

        autoTable(doc, {
          startY: yPosition,
          head: [['Método', 'Transações', 'Valor Bruto', 'Taxas (5%)', 'Valor Líquido']],
          body: paymentMethodsData.map(method => [
            method.method,
            method.count.toString(),
            formatCurrency(method.revenue),
            formatCurrency(method.revenue * 0.05),
            formatCurrency(method.revenue * 0.95)
          ]),
          theme: 'grid',
          headStyles: { fillColor: [34, 139, 34] }
        })
      }

      // Rodapé
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(
        'Este relatório é apenas para fins informativos. Consulte um contador para declarações oficiais.',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'center' }
      )

      doc.save(`relatorio_fiscal_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 size-4" />
              Exportar Relatórios
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Escolha o formato</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={exportReportPDF}>
          <FileText className="mr-2 size-4" />
          Relatório Completo (PDF)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportParticipantsCSV}>
          <FileSpreadsheet className="mr-2 size-4" />
          Lista de Participantes (CSV)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportFiscalReport}>
          <FileText className="mr-2 size-4" />
          Relatório Fiscal (PDF)
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            exportToCSV(
              ticketPerformance.map(t => ({
                Tipo: t.title,
                Vendidos: t.sold,
                Total: t.total,
                Receita: formatCurrency(t.revenue),
                'Taxa de Conversão': `${t.conversionRate.toFixed(1)}%`
              })),
              'performance_ingressos'
            )
          }}
        >
          <FileSpreadsheet className="mr-2 size-4" />
          Performance de Ingressos (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
