import type { AppliedCoupon } from '@events-manager/contracts';
import { Tag, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { Heading } from '../atoms/Heading';

export interface OrderSummaryItem {
	id: string;
	quantity: number;
	title: string;
	/** Preço que a pessoa paga por unidade, já com a taxa de serviço. */
	unitPrice: number;
	/** Parte de `unitPrice` que é taxa de serviço, para o resumo explicá-la. */
	unitFee?: number;
}

/**
 * Resumo da compra. O subtotal sai dos itens escolhidos, mas o total com cupom
 * é sempre o que a API devolveu: exibir uma conta própria abriria espaço para a
 * tela e a cobrança discordarem. O cupom aparece uma única vez, na linha do
 * desconto, com o botão de remover ao lado.
 */
export function OrderSummary({
	actionForm,
	actionLabel,
	actionSlot,
	children,
	coupon,
	footnote,
	isActionLoading,
	isActionDisabled,
	items,
	onAction,
	onRemoveCoupon,
}: {
	actionForm?: string;
	actionLabel?: string;
	actionSlot?: ReactNode;
	children?: ReactNode;
	coupon?: AppliedCoupon | null;
	footnote?: ReactNode;
	isActionLoading?: boolean;
	isActionDisabled?: boolean;
	items: OrderSummaryItem[];
	onAction?: () => void;
	onRemoveCoupon?: () => void;
}) {
	const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
	const fees = items.reduce((total, item) => total + (item.unitFee ?? 0) * item.quantity, 0);
	const discount = coupon?.discount ?? 0;
	const total = Math.max(subtotal - discount, 0);
	const isEmpty = items.length === 0;

	return (
		<section aria-labelledby="order-summary-title" className="rounded-lg border bg-card p-5 shadow-sm">
			<Heading as="h2" level="h3" id="order-summary-title">
				Resumo da compra
			</Heading>

			<div className="mt-4 space-y-3">
				{isEmpty ? (
					<p className="text-sm text-muted-foreground">Selecione ao menos um ingresso para continuar.</p>
				) : (
					items.map((item) => (
						<div key={item.id} className="flex items-start justify-between gap-3 text-sm">
							<div className="min-w-0">
								<p className="truncate font-medium text-foreground">{item.title}</p>
								<p className="text-xs text-muted-foreground">
									{item.quantity} × {formatCurrency(item.unitPrice)}
								</p>
							</div>
							<span className="shrink-0 font-medium tabular-nums">
								{formatCurrency(item.unitPrice * item.quantity)}
							</span>
						</div>
					))
				)}
			</div>

			{children ? <div className="mt-5 border-t pt-5">{children}</div> : null}

			<dl className="mt-5 space-y-2 border-t pt-5 text-sm">
				<div className="flex items-center justify-between">
					<dt className="text-muted-foreground">Subtotal</dt>
					<dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
				</div>
				{fees > 0 ? (
					<div className="-mt-1 text-xs text-muted-foreground">{`Inclui ${formatCurrency(fees)} de taxa de serviço`}</div>
				) : null}
				{coupon ? (
					<div className="flex items-center justify-between gap-2 text-success">
						<dt className="flex min-w-0 items-center gap-1.5">
							<Tag className="size-3.5 shrink-0" aria-hidden />
							<span>Cupom</span>
							<span className="truncate rounded bg-success/10 px-1.5 py-0.5 text-xs font-semibold">{coupon.code}</span>
						</dt>
						<dd className="flex shrink-0 items-center gap-1 tabular-nums">
							{`− ${formatCurrency(discount)}`}
							{onRemoveCoupon ? (
								<Button
									aria-label="Remover cupom"
									className="size-7 text-muted-foreground hover:text-destructive"
									onClick={onRemoveCoupon}
									size="icon"
									type="button"
									variant="ghost"
								>
									<X className="size-4" aria-hidden />
								</Button>
							) : null}
						</dd>
					</div>
				) : null}
				<div className="flex items-baseline justify-between border-t pt-3">
					<dt className="font-semibold text-foreground">Total</dt>
					<dd data-testid="order-total" className="text-xl font-bold tabular-nums text-foreground">
						{formatCurrency(total)}
					</dd>
				</div>
				{coupon && discount > 0 ? (
					<div className="text-right text-xs font-medium text-success">{`Você economiza ${formatCurrency(discount)}`}</div>
				) : null}
			</dl>

			{actionSlot ? (
				<div className="mt-5">{actionSlot}</div>
			) : actionLabel ? (
				<Button
					className="mt-5 w-full"
					disabled={isEmpty || isActionLoading || isActionDisabled}
					form={actionForm}
					onClick={(event) => {
						// A mudança de etapa pode transformar este mesmo botão em submit.
						// O clique anterior não deve enviar o formulário recém-montado.
						if (!actionForm) event.preventDefault();
						onAction?.();
					}}
					type={actionForm ? 'submit' : 'button'}
				>
					{isActionLoading ? 'Processando...' : actionLabel}
				</Button>
			) : null}

			{footnote ? <div className="mt-3 text-xs text-muted-foreground">{footnote}</div> : null}
		</section>
	);
}
