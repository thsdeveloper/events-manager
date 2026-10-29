import { isValidPhone, maskPhone } from '@/lib/br-documents';
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

export const PENDING_ATTENDEE_LABEL = 'Participante a informar';

/**
 * Nome de quem vai usar o ingresso. Um ingresso ainda sem participante mostra
 * o marcador, para o organizador saber que falta alguém nomear.
 */
export function getParticipantFullName(participant: ParticipantRow) {
	return participant.attendee_name ?? PENDING_ATTENDEE_LABEL;
}

export type TicketStatus = 'confirmed' | 'pending' | 'cancelled' | 'checked_in';

/**
 * Estado de um ingresso nominal. O cancelamento e o pagamento são do pedido;
 * o check-in é da própria unidade.
 */
export function deriveTicketStatus(ticket: ParticipantRow): TicketStatus {
	const { registration } = ticket;
	if (registration.status === 'cancelled') return 'cancelled';
	if (ticket.check_in_date) return 'checked_in';
	if (registration.status === 'pending' || registration.payment_status === 'pending') return 'pending';

	return 'confirmed';
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
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
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

	// Delegates to the shared implementation, which also checks the area code and
	// the mobile/landline prefix rather than only the digit count.
	return isValidPhone(phone);
}

/**
 * Formata telefone brasileiro
 */
export function formatBrazilianPhone(phone: string): string {
	return phone ? maskPhone(phone) : '';
}
