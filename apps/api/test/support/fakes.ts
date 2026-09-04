import { vi } from 'vitest';

/**
 * Cria um dublê parcial tipado como a porta completa. Só os métodos que o
 * cenário exercita precisam existir; chamar um método ausente lança
 * `TypeError`, o que denuncia um caminho não coberto pelo teste.
 */
export function partialMock<T>(value: Partial<Record<keyof T, unknown>>): T {
	return value as T;
}

/**
 * Cria um dublê completo a partir da lista de métodos da porta. Todo método é
 * um `vi.fn()` que resolve `undefined` até ser configurado no teste.
 */
export function fakePort<T extends object>(
	methods: ReadonlyArray<keyof T>,
): {
	[K in keyof T]: ReturnType<typeof vi.fn>;
} {
	const fake = {} as { [K in keyof T]: ReturnType<typeof vi.fn> };
	for (const method of methods) fake[method] = vi.fn();
	return fake;
}

export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_ORGANIZER_ID = '00000000-0000-4000-8000-000000000002';
export const TEST_EVENT_ID = '00000000-0000-4000-8000-000000000010';
