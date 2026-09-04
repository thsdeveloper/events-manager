import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, type RenderHookOptions, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';

/**
 * Cliente React Query para testes: sem retries e sem cache entre testes, para
 * que um erro apareça na primeira tentativa e um teste não enxergue o dado do
 * anterior.
 */
export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			// retryDelay zerado: hooks que definem `retry` próprio não esperam 1s entre tentativas.
			queries: { retry: false, retryDelay: 0, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	});
}

interface ProviderOptions {
	queryClient?: QueryClient;
}

function createWrapper({ queryClient = createTestQueryClient() }: ProviderOptions = {}) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	};
}

/**
 * Renderiza um componente com os providers globais da aplicação e devolve um
 * `user` do user-event já configurado para interações realistas.
 *
 * @example
 * const { user } = renderWithProviders(<TicketForm />);
 * await user.type(screen.getByLabelText('Preço'), '100');
 */
export function renderWithProviders(ui: ReactElement, options: RenderOptions & ProviderOptions = {}) {
	const { queryClient, ...renderOptions } = options;
	const user = userEvent.setup();

	return {
		user,
		...render(ui, { wrapper: createWrapper({ queryClient }), ...renderOptions }),
	};
}

/**
 * Renderiza um hook com os mesmos providers de `renderWithProviders`.
 */
export function renderHookWithProviders<Result, Props>(
	hook: (props: Props) => Result,
	options: RenderHookOptions<Props> & ProviderOptions = {},
) {
	const { queryClient, ...hookOptions } = options;

	return renderHook(hook, { wrapper: createWrapper({ queryClient }), ...hookOptions });
}

export { userEvent };
