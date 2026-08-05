import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ParticipantRow } from './types';
import { formatCurrency, statusLabels, paymentStatusLabels, paymentMethodLabels } from './utils';

/**
 * Colunas do CSV de exportação
 */
const CSV_COLUMNS = [
  'Código',
  'Nome',
  'Email',
  'Telefone',
  'Documento',
  'Evento',
  'Data Evento',
  'Tipo Ingresso',
  'Quantidade',
  'Valor Total',
  'Status Pagamento',
  'Método Pagamento',
  'Status Inscrição',
  'Data Check-in',
  'Data Inscrição',
] as const;

/**
 * Escapa valores CSV (adiciona aspas se necessário)
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const stringValue = String(value);

  // Se contém vírgula, aspas ou quebra de linha, envolve em aspas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converte uma linha de participante para array CSV
 */
function participantToCSVRow(participant: ParticipantRow): string[] {
  return [
    escapeCsvValue(participant.ticket_code),
    escapeCsvValue(participant.participant_name),
    escapeCsvValue(participant.participant_email),
    escapeCsvValue(participant.participant_phone || ''),
    escapeCsvValue(participant.participant_document || ''),
    escapeCsvValue(participant.event_id.title),
    escapeCsvValue(
      participant.event_id.start_date
        ? format(new Date(participant.event_id.start_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : ''
    ),
    escapeCsvValue(participant.ticket_type_id?.title || ''),
    escapeCsvValue(participant.quantity),
    escapeCsvValue(formatCurrency(participant.total_amount)),
    escapeCsvValue(paymentStatusLabels[participant.payment_status || ''] || participant.payment_status || ''),
    escapeCsvValue(
      participant.payment_method
        ? paymentMethodLabels[participant.payment_method] || participant.payment_method
        : ''
    ),
    escapeCsvValue(statusLabels[participant.status || ''] || participant.status || ''),
    escapeCsvValue(
      participant.check_in_date
        ? format(new Date(participant.check_in_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : ''
    ),
    escapeCsvValue(
      participant.date_created
        ? format(new Date(participant.date_created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : ''
    ),
  ];
}

/**
 * Gera conteúdo CSV a partir de dados de participantes
 */
export function generateCSV(participants: ParticipantRow[]): string {
  // Header
  const header = CSV_COLUMNS.join(',');

  // Rows
  const rows = participants.map((participant) => {
    const row = participantToCSVRow(participant);
    
return row.join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Gera nome do arquivo CSV com timestamp
 */
export function generateCSVFilename(): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  
return `participantes_${timestamp}.csv`;
}

/**
 * Adiciona BOM UTF-8 para compatibilidade com Excel
 */
function addUTF8BOM(content: string): string {
  return '\ufeff' + content;
}

/**
 * Faz download do CSV
 */
export function downloadCSV(participants: ParticipantRow[]): void {
  // Gera conteúdo CSV
  const csvContent = generateCSV(participants);

  // Adiciona BOM UTF-8 para Excel
  const csvWithBOM = addUTF8BOM(csvContent);

  // Cria blob
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });

  // Cria link temporário para download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', generateCSVFilename());
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libera URL
  URL.revokeObjectURL(url);
}
