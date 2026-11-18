'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	brDocumentSchema,
	brPhoneSchema,
	type CheckoutQuote,
	type CheckoutQuoteInput,
} from '@events-manager/contracts';
import { PaymentMethodSection, type InstallmentTicketConfig } from './PaymentMethodSection';
import { SecureCardFields } from './SecureCardFields';
import { cardError, type SecureCardInstance } from '../lib/abacatepay';
import type { PaymentMethod } from '../api/usePaymentMethods';
import type { useCheckout } from '@/hooks/useCheckout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { maskDocument, maskPhone } from '@/lib/br-documents';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { describeProblem } from '@/lib/problem';
import { formatCurrency } from '@/lib/formatters';
export function TransparentCheckoutForm({
	cart,
	checkout,
	method,
	onMethodChange,
	onBack,
	onPixPlan,
	onQuote,
	ticket,
	disabled = false,
}: {
	cart: CheckoutQuoteInput;
	checkout: ReturnType<typeof useCheckout>;
	method: PaymentMethod;
	onMethodChange(method: PaymentMethod): void;
	onBack(): void;
	onPixPlan(installments: number): Promise<void>;
	onQuote?(quote: CheckoutQuote): void;
	ticket?: InstallmentTicketConfig;
	disabled?: boolean;
}) {
	const [cardCount, setCardCount] = useState(1);
	const [pixCount, setPixCount] = useState<number | null>(1);
	const [cardReady, setCardReady] = useState(false);
	const [tokenizing, setTokenizing] = useState(false);
	const card = useRef<SecureCardInstance | null>(null);
	const submitting = useRef(false);
	const onInstance = useCallback((value: SecureCardInstance | null) => {
		card.current = value;
	}, []);
	const quoteInput = {
		eventId: cart.eventId,
		tickets: cart.tickets.map(({ ticketId, quantity }) => ({ ticketId, quantity })),
		couponCode: cart.couponCode,
		participantInfo: { name: cart.participantInfo.name, email: cart.participantInfo.email },
	};
	const quote = useQuery({
		queryKey: ['checkout-quote', quoteInput],
		queryFn: async ({ signal }): Promise<CheckoutQuote> => {
			const response = await fetch('/api/payments/checkout/quote', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(quoteInput),
				signal,
			});
			const data = await response.json();
			if (!response.ok) throw new Error(describeProblem(data));

			return data;
		},
		retry: false,
		staleTime: 15000,
	});
	const activeMethod = quote.data?.methods.includes(method) ? method : (quote.data?.methods[0] ?? 'PIX');
	useEffect(() => {
		if (quote.data) onQuote?.(quote.data);
	}, [quote.data, onQuote]);
	const free = quote.data?.amountInCents === 0;
	const busy = disabled || checkout.isLoading || tokenizing;
	const missingProfileData =
		!free &&
		((activeMethod !== 'PIX' &&
			(!cart.participantInfo.document || !brDocumentSchema.safeParse(cart.participantInfo.document).success)) ||
			(activeMethod === 'CARD' &&
				(!cart.participantInfo.phone || !brPhoneSchema.safeParse(cart.participantInfo.phone).success)));
	const installments = Math.min(cardCount, quote.data?.maxInstallments ?? 1);
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (submitting.current || busy || !quote.data) return;
		submitting.current = true;
		try {
			if (
				!free &&
				activeMethod !== 'PIX' &&
				(!cart.participantInfo.document || !brDocumentSchema.safeParse(cart.participantInfo.document).success)
			)
				throw new Error('Complete o CPF nos Dados pessoais do perfil e atualize o checkout.');
			if (
				!free &&
				activeMethod === 'CARD' &&
				(!cart.participantInfo.phone || !brPhoneSchema.safeParse(cart.participantInfo.phone).success)
			)
				throw new Error('Complete o celular nos Dados pessoais do perfil e atualize o checkout.');
			if (
				activeMethod === 'PIX' &&
				pixCount &&
				pixCount > 1 &&
				ticket?.allow_installments &&
				!cart.couponCode &&
				cart.tickets.length === 1
			) {
				await onPixPlan(pixCount);

				return;
			}
			let token: string | undefined;
			if (activeMethod === 'CARD' && !free) {
				if (quote.data.mock) token = 'ctok_local_simulation';
				else {
					if (!card.current || !cardReady) return;
					setTokenizing(true);
					try {
						token = (
							await card.current.tokenize({
								name: cart.participantInfo.name,
								email: cart.participantInfo.email,
								taxId: cart.participantInfo.document!,
								cellphone: cart.participantInfo.phone!,
							})
						).token;
					} catch (error) {
						throw new Error(cardError(error));
					} finally {
						setTokenizing(false);
					}
				}
			}
			await checkout.createCheckoutSession(cart.tickets, cart.participantInfo, cart.couponCode, activeMethod, {
				expectedAmountInCents: quote.data.amountInCents,
				token,
				installments: activeMethod === 'CARD' ? installments : 1,
			});
		} catch (error) {
			toast({
				title: 'Não foi possível concluir a compra',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			submitting.current = false;
		}
	}
	if (quote.isPending) return <p role="status">Conferindo ingressos e valor da compra…</p>;
	if (quote.isError)
		return (
			<div role="alert" className="space-y-3">
				<p>{quote.error.message}</p>
				<Button type="button" variant="outline" onClick={() => quote.refetch()}>
					Tentar novamente
				</Button>
				<Button type="button" variant="ghost" onClick={onBack}>
					Voltar
				</Button>
			</div>
		);

	return (
		<form onSubmit={submit} className="space-y-6" id="checkout-form">
			<p className="text-lg font-semibold">Total a pagar: {formatCurrency(quote.data.amountInCents / 100)}</p>
			{!free ? (
				<>
					<PaymentMethodSection
						availableMethods={quote.data.methods}
						method={activeMethod}
						disabled={busy}
						onMethodChange={(value) => {
							setPixCount(1);
							onMethodChange(value);
						}}
						selectedInstallments={pixCount}
						onInstallmentChange={setPixCount}
						ticket={cart.tickets.length === 1 && !cart.couponCode ? ticket : { allow_installments: false }}
						totalAmount={quote.data.amountInCents / 100}
					/>
					{activeMethod !== 'PIX' ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="payment-document">CPF ou CNPJ do comprador *</Label>
								<Input
									id="payment-document"
									value={maskDocument(cart.participantInfo.document ?? '')}
									readOnly
									disabled={busy}
								/>
							</div>
							{activeMethod === 'CARD' ? (
								<div className="space-y-2">
									<Label htmlFor="payment-phone">Celular do comprador *</Label>
									<Input
										id="payment-phone"
										value={maskPhone(cart.participantInfo.phone ?? '')}
										readOnly
										disabled={busy}
									/>
								</div>
							) : null}
						</div>
					) : null}
					{activeMethod === 'CARD' ? (
						<div className="space-y-4">
							<Label htmlFor="card-installments">Parcelas no cartão</Label>
							<Select
								value={String(installments)}
								onValueChange={(value) => setCardCount(Number(value))}
								disabled={busy}
							>
								<SelectTrigger id="card-installments">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: quote.data.maxInstallments }, (_, i) => (
										<SelectItem key={i} value={String(i + 1)}>
											{i + 1}x de {formatCurrency(quote.data.amountInCents / 100 / (i + 1))} — sem acréscimo
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{quote.data.mock ? (
								<p role="status">Ambiente de simulação: nenhum cartão será cobrado.</p>
							) : quote.data.publicKey ? (
								<SecureCardFields
									publicKey={quote.data.publicKey}
									amount={quote.data.amountInCents}
									onInstance={onInstance}
									onReady={setCardReady}
								/>
							) : (
								<p role="alert">Cartão indisponível neste momento.</p>
							)}
						</div>
					) : null}
				</>
			) : (
				<p>Esta inscrição é gratuita. Nenhum pagamento será solicitado.</p>
			)}
			{missingProfileData ? (
				<div role="alert" className="space-y-2 rounded-lg border p-4 text-sm">
					<p>
						Complete o CPF e, para cartão, o celular nos Dados pessoais do perfil. Depois volte à etapa Seus dados e
						clique em Atualizar dados do perfil.
					</p>
					<Link
						href="/perfil?section=personal"
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium text-primary hover:underline"
					>
						Atualizar meu perfil
					</Link>
				</div>
			) : null}
			<div className="flex gap-3">
				<Button type="button" variant="outline" onClick={onBack} disabled={busy}>
					Voltar
				</Button>
				<Button
					type="submit"
					className="flex-1"
					disabled={
						busy ||
						missingProfileData ||
						(!free && (quote.data.methods.length === 0 || (activeMethod === 'CARD' && !quote.data.mock && !cardReady)))
					}
				>
					{tokenizing
						? 'Autenticando cartão…'
						: busy
							? 'Processando…'
							: free
								? 'Confirmar inscrição gratuita'
								: `Pagar ${formatCurrency(quote.data.amountInCents / 100)}`}
				</Button>
			</div>
		</form>
	);
}
