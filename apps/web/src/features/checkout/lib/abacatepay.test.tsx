import { afterEach, expect, it, vi } from 'vitest';
import type { CardSdk } from './abacatepay';
const sdk: CardSdk = { create: vi.fn() };
afterEach(() => {
	delete window.AbacatePay;
	document.head.querySelectorAll('script[src*="abacatepay"]').forEach((script) => script.remove());
	vi.useRealTimers();
	vi.resetModules();
});
it('loads the official SDK once while concurrent callers await it', async () => {
	const { loadCardSdk } = await import('./abacatepay');
	const first = loadCardSdk(),
		second = loadCardSdk();
	const scripts = document.head.querySelectorAll('script[src="https://abacatepay.com/abacatepay.js"]');
	expect(scripts).toHaveLength(1);
	window.AbacatePay = sdk;
	scripts[0].dispatchEvent(new Event('load'));
	await expect(first).resolves.toBe(sdk);
	await expect(second).resolves.toBe(sdk);
	await expect(loadCardSdk()).resolves.toBe(sdk);
});
it('allows retry after the network fails to load the secure form', async () => {
	const { loadCardSdk } = await import('./abacatepay');
	const first = loadCardSdk();
	const rejected = expect(first).rejects.toThrow('Não foi possível carregar');
	document.head.querySelector('script[src*="abacatepay"]')!.dispatchEvent(new Event('error'));
	await rejected;
	const retry = loadCardSdk();
	window.AbacatePay = sdk;
	document.head.querySelector('script[src*="abacatepay"]')!.dispatchEvent(new Event('load'));
	await expect(retry).resolves.toBe(sdk);
});
it('does not leave the buyer waiting forever on an unavailable script', async () => {
	vi.useFakeTimers();
	const { loadCardSdk } = await import('./abacatepay');
	const result = loadCardSdk();
	const rejected = expect(result).rejects.toThrow('Não foi possível carregar');
	await vi.advanceTimersByTimeAsync(20000);
	await rejected;
});
it('refuses a script that loaded without exporting the documented SDK', async () => {
	const { loadCardSdk } = await import('./abacatepay');
	const result = loadCardSdk();
	const rejected = expect(result).rejects.toThrow();
	document.head.querySelector('script[src*="abacatepay"]')!.dispatchEvent(new Event('load'));
	await rejected;
});
it('shows actionable messages without provider internals or sensitive values', async () => {
	const { cardError } = await import('./abacatepay');
	expect(cardError({ code: 'THREE_DS_FAILED' })).toContain('autenticação');
	for (const code of ['CARD_INCOMPLETE', 'CARD_INVALID']) expect(cardError({ code })).toContain('Confira os campos');
	expect(cardError({ code: 'API', message: 'secret-token' })).not.toContain('secret-token');
	expect(cardError(null)).toContain('Não foi possível');
});
