/**
 * @fileoverview Apresentação de erros Problem Details via Toast (shadcn/ui)
 *
 * Converte erros HTTP estruturados em mensagens amigáveis para o usuário
 * usando o sistema de toast do shadcn/ui.
 */

import type { ToastActionElement } from '@/components/ui/toast';
import type { HttpError } from './http';

/**
 * Tipo do toast do shadcn/ui
 */
export interface Toast {
  (props: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
    action?: ToastActionElement;
    duration?: number;
  }): unknown;
}

/**
 * Opções para apresentação do toast
 */
export interface PresentProblemToastOptions {
  /**
   * Códigos de erro que não devem mostrar toast (erros silenciosos)
   */
  suppressCodes?: string[];

  /**
   * Duração customizada do toast (ms)
   */
  duration?: number;

  /**
   * Callback executado quando usuário clica em ação
   */
  onAction?: () => void;

  /**
   * Se deve incluir requestId na mensagem
   * @default true em desenvolvimento, false em produção
   */
  includeRequestId?: boolean;
}

/**
 * Apresenta erro HTTP como toast amigável ao usuário
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useToast } from '@/hooks/use-toast'
 * import { presentProblemToast } from '@/lib/toast-problem'
 *
 * function MyComponent() {
 *   const { toast } = useToast()
 *
 *   async function handleSubmit() {
 *     try {
 *       await apiFetch('/api/users', { method: 'POST', body: data })
 *     } catch (error) {
 *       presentProblemToast(toast, error)
 *     }
 *   }
 * }
 * ```
 */
export function presentProblemToast(
  toast: Toast,
  error: unknown,
  options: PresentProblemToastOptions = {}
): void {
  const {
    suppressCodes = [],
    duration,
    onAction,
    includeRequestId = process.env.NODE_ENV === 'development',
  } = options;

  // Apenas trata HttpError
  if (!isHttpError(error)) {
    // Erro genérico
    toast({
      title: 'Erro inesperado',
      description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido',
      variant: 'destructive',
      duration: duration || 5000,
    });
    
return;
  }

  // Verifica se deve suprimir
  if (suppressCodes.includes(error.code)) {
    return;
  }

  // Mapeia erro para mensagem amigável
  const { title, description, action } = mapErrorToToast(error, onAction);

  // Adiciona requestId se configurado
  let finalDescription = description;
  if (includeRequestId && error.requestId) {
    finalDescription += `\n\nID da requisição: ${error.requestId}`;
  }

  // Mostra toast
  toast({
    title,
    description: finalDescription,
    variant: 'destructive',
    action,
    duration: duration || getDefaultDuration(error.status),
  });
}

/**
 * Mapeia HttpError para título e descrição do toast
 */
function mapErrorToToast(
  error: HttpError,
  onAction?: () => void
): {
  title: string;
  description: string;
  action?: undefined;
} {
  const status = error.status;

  // 401 - Não autenticado
  if (status === 401) {
    return {
      title: 'Sessão expirada',
      description: error.message || 'Sua sessão expirou. Faça login novamente para continuar.',
      action: undefined,
    };
  }

  // 403 - Acesso negado
  if (status === 403) {
    return {
      title: 'Acesso negado',
      description: error.message || 'Você não tem permissão para realizar esta ação.',
    };
  }

  // 404 - Não encontrado
  if (status === 404) {
    return {
      title: 'Não encontrado',
      description: error.message || 'O recurso solicitado não foi encontrado.',
    };
  }

  // 409 - Conflito
  if (status === 409) {
    return {
      title: 'Conflito',
      description: error.message || 'Esta ação conflita com o estado atual dos dados.',
    };
  }

  // 422 - Validação
  if (status === 422) {
    return {
      title: 'Dados inválidos',
      description: formatValidationErrors(error),
    };
  }

  // 429 - Rate limit
  if (status === 429) {
    const retryAfter = error.context?.retryAfter as number | undefined;
    const retryMessage = retryAfter
      ? ` Tente novamente em ${retryAfter} segundos.`
      : ' Tente novamente em alguns instantes.';

    return {
      title: 'Muitas requisições',
      description: error.message || 'Você está fazendo muitas requisições.' + retryMessage,
    };
  }

  // 500-599 - Erro de servidor
  if (status >= 500) {
    return {
      title: 'Erro no servidor',
      description: error.message || 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
    };
  }

  // 0 - Erro de rede
  if (status === 0) {
    return {
      title: 'Erro de conexão',
      description: error.message || 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    };
  }

  // Erro genérico
  return {
    title: 'Erro',
    description: error.message || 'Ocorreu um erro ao processar sua requisição.',
  };
}

/**
 * Formata erros de validação (422) em lista amigável
 */
function formatValidationErrors(error: HttpError): string {
  const errors = error.context?.errors as Record<string, string[]> | undefined;

  if (!errors || Object.keys(errors).length === 0) {
    return error.message || 'Os dados enviados são inválidos.';
  }

  // Formata como lista
  const lines: string[] = ['Os seguintes campos possuem erros:'];

  Object.entries(errors).forEach(([field, messages]) => {
    const fieldName = formatFieldName(field);
    lines.push(`\n• ${fieldName}: ${messages.join(', ')}`);
  });

  return lines.join('');
}

/**
 * Formata nome do campo de forma amigável
 *
 * @example
 * "user.email" -> "Email"
 * "password_confirmation" -> "Confirmação de senha"
 */
function formatFieldName(field: string): string {
  // Remove prefixos de nested fields
  const parts = field.split('.');
  const lastPart = parts[parts.length - 1];

  // Converte snake_case para Title Case
  return lastPart
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Retorna duração padrão do toast baseada no status
 */
function getDefaultDuration(status: number): number {
  // Erros críticos ficam mais tempo
  if (status === 401 || status === 403 || status >= 500) {
    return 7000; // 7 segundos
  }

  // Validações ficam tempo médio
  if (status === 422) {
    return 6000; // 6 segundos
  }

  // Outros erros
  return 5000; // 5 segundos
}

/**
 * Type guard para HttpError
 */
function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}
