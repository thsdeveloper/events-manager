import type { ParticipantRow } from './types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data para exibição
 */
export function formatDate(dateString: string | null, formatStr: string = 'dd/MM/yyyy HH:mm') {
  if (!dateString) return '—';

  try {
    return format(parseISO(dateString), formatStr, { locale: ptBR });
  } catch {
    return '—';
  }
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Obtém nome completo do participante
 */
export function getParticipantFullName(participant: ParticipantRow) {
  if (participant.user_id) {
    const { first_name, last_name } = participant.user_id;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
  }

  return participant.participant_name;
}

/**
 * Obtém iniciais para avatar
 */
export function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Labels de status
 */
export const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  checked_in: 'Check-in feito',
};

export const paymentStatusLabels: Record<string, string> = {
  free: 'Gratuito',
  paid: 'Pago',
  pending: 'Pendente',
  refunded: 'Reembolsado',
};

export const paymentMethodLabels: Record<string, string> = {
  card: 'Cartão',
  pix: 'PIX',
  boleto: 'Boleto',
  free: 'Gratuito',
};

/**
 * Classes CSS para badges de status
 */
export const statusBadgeClasses: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  checked_in: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export const paymentStatusBadgeClasses: Record<string, string> = {
  free: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  refunded: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);
}

/**
 * Valida telefone brasileiro
 */
export function isValidBrazilianPhone(phone: string): boolean {
  if (!phone) return true; // Telefone é opcional

  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');

  // Valida formato brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  return /^(\d{2})(\d{4,5})(\d{4})$/.test(cleaned);
}

/**
 * Formata telefone brasileiro
 */
export function formatBrazilianPhone(phone: string): string {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Verifica se email já está em uso por outro participante do mesmo evento
 * (Esta função será implementada no backend)
 */
export async function isEmailUniqueInEvent(
  email: string,
  eventId: string,
  excludeRegistrationId?: string,
  token?: string
): Promise<boolean> {
  if (!token) {
    return true;
  }

  try {
    const params = new URLSearchParams({
      email,
      eventId,
      ...(excludeRegistrationId && { excludeId: excludeRegistrationId }),
    });

    const response = await fetch(`/api/admin/participantes/check-email?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return true; // Em caso de erro, permitir
    }

    const data = await response.json();

    return data.isUnique ?? true;
  } catch (error) {
    console.error('Error checking email uniqueness:', error);

    return true; // Em caso de erro, permitir
  }
}
