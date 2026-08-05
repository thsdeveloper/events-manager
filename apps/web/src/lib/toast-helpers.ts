/**
 * @fileoverview Helpers para facilitar o uso de toasts tipados
 *
 * Fornece funções convenientes para mostrar toasts de sucesso, erro, warning e info
 * com as cores e ícones corretos.
 */

import { toast, type Toast } from '@/hooks/use-toast';

interface ToastMessage {
	title: string;
	description?: string;
	duration?: number;
}

/**
 * Mostra toast de sucesso (verde com ícone de check)
 */
export function toastSuccess({ title, description, duration }: ToastMessage) {
	return toast({
		title,
		description,
		duration,
		variant: 'success',
	});
}

/**
 * Mostra toast de erro (vermelho com ícone de X)
 */
export function toastError({ title, description, duration }: ToastMessage) {
	return toast({
		title,
		description,
		duration,
		variant: 'destructive',
	});
}

/**
 * Mostra toast de warning (amarelo com ícone de alerta)
 */
export function toastWarning({ title, description, duration }: ToastMessage) {
	return toast({
		title,
		description,
		duration,
		variant: 'warning',
	});
}

/**
 * Mostra toast de informação (azul com ícone de info)
 */
export function toastInfo({ title, description, duration }: ToastMessage) {
	return toast({
		title,
		description,
		duration,
		variant: 'info',
	});
}

/**
 * Type guard para verificar se uma função toast está disponível
 */
export function isToastFunction(toast: unknown): toast is Toast {
	return typeof toast === 'function';
}
