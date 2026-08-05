/**
 * @fileoverview Wrapper de alto nível do apiFetch com integração automática de toast
 *
 * Este módulo fornece apiFetchClient que:
 * - Usa apiFetch internamente (SSR-safe)
 * - Mostra toast automaticamente em erros (se configurado)
 * - Permite customização de comportamento por requisição
 */

'use client';

import { apiFetch, type ApiFetchOptions } from './http';
import { presentProblemToast, type PresentProblemToastOptions , Toast } from './toast-problem';

/**
 * Opções estendidas com suporte a toast automático
 */
export interface ApiFetchClientOptions extends ApiFetchOptions {
  /**
   * Se deve mostrar toast automaticamente em caso de erro
   * @default true
   */
  toastOnError?: boolean;

  /**
   * Opções para customizar o toast de erro
   */
  toastOptions?: PresentProblemToastOptions;
}

/**
 * Configuração global do cliente
 */
let globalToast: Toast | null = null;
let globalToastOptions: PresentProblemToastOptions = {};

/**
 * Configura toast global para apiFetchClient
 *
 * Deve ser chamado uma vez no _app.tsx ou layout.tsx
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * 'use client'
 *
 * import { useToast } from '@/hooks/use-toast'
 * import { configureToast } from '@/lib/http-client'
 *
 * export default function RootLayout({ children }) {
 *   const { toast } = useToast()
 *
 *   useEffect(() => {
 *     configureToast(toast, {
 *       suppressCodes: ['SILENT_ERROR'],
 *       includeRequestId: true
 *     })
 *   }, [toast])
 *
 *   return children
 * }
 * ```
 */
export function configureToast(
  toast: Toast,
  options: PresentProblemToastOptions = {}
): void {
  globalToast = toast;
  globalToastOptions = options;
}

/**
 * Cliente HTTP com toast automático em erros
 *
 * Wrapper do apiFetch que automaticamente mostra toast para erros HTTP.
 * Útil em componentes onde você quer UX consistente sem precisar
 * tratar cada erro manualmente.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { apiFetchClient } from '@/lib/http-client'
 *
 * function MyComponent() {
 *   async function handleSubmit() {
 *     // Toast será mostrado automaticamente em caso de erro
 *     const user = await apiFetchClient('/api/users', {
 *       method: 'POST',
 *       body: { name: 'João' }
 *     })
 *
 *     // Sucesso - sem toast, apenas retorna dados
 *     console.log(user)
 *   }
 *
 *   async function handleDelete() {
 *     // Desabilita toast para erro específico
 *     try {
 *       await apiFetchClient('/api/users/123', {
 *         method: 'DELETE',
 *         toastOnError: false
 *       })
 *     } catch (error) {
 *       // Trata erro manualmente
 *       console.log('Usuário não deletado')
 *     }
 *   }
 *
 *   async function handleUpdate() {
 *     // Customiza toast para este erro
 *     await apiFetchClient('/api/users/123', {
 *       method: 'PUT',
 *       body: data,
 *       toastOptions: {
 *         suppressCodes: ['NOT_FOUND'], // Não mostra toast para 404
 *         duration: 3000
 *       }
 *     })
 *   }
 *
 *   return <button onClick={handleSubmit}>Criar</button>
 * }
 * ```
 */
export async function apiFetchClient<T = unknown>(
  url: string,
  options: ApiFetchClientOptions = {}
): Promise<T> {
  const {
    toastOnError = true,
    toastOptions = {},
    ...fetchOptions
  } = options;

  try {
    return await apiFetch<T>(url, fetchOptions);
  } catch (error) {
    // Mostra toast se habilitado e toast foi configurado
    if (toastOnError && globalToast) {
      presentProblemToast(globalToast, error, {
        ...globalToastOptions,
        ...toastOptions,
      });
    }

    // Re-lança erro para permitir tratamento adicional
    throw error;
  }
}

/**
 * Helpers para métodos HTTP comuns com toast automático
 */
export const httpClient = {
  /**
   * GET com toast automático
   */
  get: <T = unknown>(
    url: string,
    options?: Omit<ApiFetchClientOptions, 'method' | 'body'>
  ) => apiFetchClient<T>(url, { ...options, method: 'GET' }),

  /**
   * POST com toast automático
   */
  post: <T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<ApiFetchClientOptions, 'method'>
  ) => apiFetchClient<T>(url, { ...options, method: 'POST', body }),

  /**
   * PUT com toast automático
   */
  put: <T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<ApiFetchClientOptions, 'method'>
  ) => apiFetchClient<T>(url, { ...options, method: 'PUT', body }),

  /**
   * PATCH com toast automático
   */
  patch: <T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<ApiFetchClientOptions, 'method'>
  ) => apiFetchClient<T>(url, { ...options, method: 'PATCH', body }),

  /**
   * DELETE com toast automático
   */
  delete: <T = unknown>(
    url: string,
    options?: Omit<ApiFetchClientOptions, 'method' | 'body'>
  ) => apiFetchClient<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Helper para criar wrapper customizado com toast
 *
 * Útil para criar clientes especializados (ex: client de auth, client de CMS)
 *
 * @example
 * ```ts
 * // lib/cms-client.ts
 * import { createHttpClient } from '@/lib/http-client'
 *
 * export const cmsClient = createHttpClient('/api/cms', {
 *   toastOnError: true,
 *   toastOptions: {
 *     suppressCodes: ['NOT_FOUND'] // CMS não mostra toast para 404
 *   },
 *   headers: {
 *     'X-CMS-Version': '1.0'
 *   }
 * })
 *
 * // Uso
 * const posts = await cmsClient.get<Post[]>('/posts')
 * ```
 */
export function createHttpClient(
  baseUrl: string,
  defaultOptions: ApiFetchClientOptions = {}
) {
  return {
    fetch: <T = unknown>(url: string, options?: ApiFetchClientOptions) =>
      apiFetchClient<T>(baseUrl + url, { ...defaultOptions, ...options }),

    get: <T = unknown>(
      url: string,
      options?: Omit<ApiFetchClientOptions, 'method' | 'body'>
    ) =>
      apiFetchClient<T>(baseUrl + url, {
        ...defaultOptions,
        ...options,
        method: 'GET',
      }),

    post: <T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<ApiFetchClientOptions, 'method'>
    ) =>
      apiFetchClient<T>(baseUrl + url, {
        ...defaultOptions,
        ...options,
        method: 'POST',
        body,
      }),

    put: <T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<ApiFetchClientOptions, 'method'>
    ) =>
      apiFetchClient<T>(baseUrl + url, {
        ...defaultOptions,
        ...options,
        method: 'PUT',
        body,
      }),

    patch: <T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<ApiFetchClientOptions, 'method'>
    ) =>
      apiFetchClient<T>(baseUrl + url, {
        ...defaultOptions,
        ...options,
        method: 'PATCH',
        body,
      }),

    delete: <T = unknown>(
      url: string,
      options?: Omit<ApiFetchClientOptions, 'method' | 'body'>
    ) =>
      apiFetchClient<T>(baseUrl + url, {
        ...defaultOptions,
        ...options,
        method: 'DELETE',
      }),
  };
}
