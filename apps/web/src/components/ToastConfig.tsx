/**
 * @fileoverview Configuração global do toast para tratamento de erros
 *
 * Este componente deve ser incluído no layout root para configurar
 * o toast usado pelo httpClient para mostrar erros automaticamente.
 */

'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { configureToast } from '@/lib/http-client';

export function ToastConfig() {
	const { toast } = useToast();

	useEffect(() => {
		// Configura toast global para httpClient
		configureToast(toast, {
			// Mostra requestId apenas em desenvolvimento
			includeRequestId: process.env.NODE_ENV === 'development',
		});
	}, [toast]);

	// Este componente não renderiza nada
	return null;
}
