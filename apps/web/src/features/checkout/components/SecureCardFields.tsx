'use client';
import { useEffect, useRef, useState } from 'react';
import { loadCardSdk, type SecureCardInstance } from '../lib/abacatepay';
import { Button } from '@/components/ui/button';
export function SecureCardFields({
	publicKey,
	amount,
	onInstance,
	onReady,
}: {
	publicKey: string;
	amount: number;
	onInstance(instance: SecureCardInstance | null): void;
	onReady(ready: boolean): void;
}) {
	const target = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [retry, setRetry] = useState(0);
	useEffect(() => {
		let disposed = false;
		let instance: SecureCardInstance | undefined;
		onReady(false);
		setError(null);
		void loadCardSdk()
			.then(async (sdk) => {
				if (disposed || !target.current) return;
				instance = sdk.create({
					publicKey,
					amount,
					locale: 'pt',
					icons: true,
					theme: { styles: { input: { fontSize: '16px', color: '#272033' } } },
					onCardChange: (state) => {
						if (!disposed) onReady(state.canTokenize);
					},
				});
				onInstance(instance);
				await instance.mount(target.current);
				if (disposed) instance.destroy();
				else onReady(instance.canTokenize);

				return undefined;
			})
			.catch(() => {
				if (!disposed) {
					onReady(false);
					setError('Não foi possível carregar o formulário seguro do cartão.');
				}
			});

		return () => {
			disposed = true;
			instance?.destroy();
			onInstance(null);
			onReady(false);
		};
	}, [publicKey, amount, retry, onInstance, onReady]);

	return (
		<section aria-label="Dados seguros do cartão" className="space-y-3">
			<div ref={target} className="min-h-44" />
			{error ? (
				<div role="alert">
					<p>{error}</p>
					<Button type="button" variant="outline" onClick={() => setRetry((v) => v + 1)}>
						Tentar carregar novamente
					</Button>
				</div>
			) : null}
			<p className="text-xs text-muted-foreground">
				Os dados do cartão são enviados diretamente ao processador. A Flouvi não armazena o número nem o código de
				segurança.
			</p>
		</section>
	);
}
