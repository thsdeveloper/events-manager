export interface CardPayer {
	name: string;
	email: string;
	taxId: string;
	cellphone: string;
}
export interface SecureCardInstance {
	mount(element: HTMLElement): Promise<void>;
	destroy(): void;
	canTokenize: boolean;
	tokenize(payer: CardPayer): Promise<{ token: string }>;
}
export interface CardSdk {
	create(options: {
		publicKey: string;
		amount: number;
		locale: 'pt';
		icons: boolean;
		theme?: Record<string, unknown>;
		onCardChange(state: { canTokenize: boolean }): void;
	}): SecureCardInstance;
}
declare global {
	interface Window {
		AbacatePay?: CardSdk;
	}
}
let loading: Promise<CardSdk> | undefined;
/** Load only on the payment screen. Card fields stay in the provider's secure form. */
export function loadCardSdk(): Promise<CardSdk> {
	if (window.AbacatePay) return Promise.resolve(window.AbacatePay);
	if (loading) return loading;
	loading = new Promise<CardSdk>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://abacatepay.com/abacatepay.js';
		script.async = true;
		const timeout = setTimeout(() => fail(), 20000);
		const fail = () => {
			clearTimeout(timeout);
			script.remove();
			loading = undefined;
			reject(new Error('Não foi possível carregar o formulário seguro. Tente novamente.'));
		};
		script.onload = () => {
			clearTimeout(timeout);
			if (window.AbacatePay) resolve(window.AbacatePay);
			else fail();
		};
		script.onerror = fail;
		document.head.appendChild(script);
	});

	return loading;
}
export function cardError(error: unknown) {
	const code = (error as { code?: string })?.code;
	if (code === 'THREE_DS_FAILED')
		return 'A autenticação do cartão não foi concluída. Tente novamente ou escolha outro meio.';
	if (code === 'CARD_INCOMPLETE' || code === 'CARD_INVALID') return 'Confira os campos do cartão no formulário seguro.';

	return 'Não foi possível processar o cartão. Confira seus dados ou tente outra forma de pagamento.';
}
