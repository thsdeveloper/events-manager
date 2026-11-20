import type { TicketPurchaseDetails } from '@events-manager/contracts';
import { View } from 'react-native';
import { Badge, Card, Heading, Label, s } from '../../shared/ui';
import { dateLabel, money } from '../../shared/theme';
export function PaymentSummary({ purchase }: { purchase: TicketPurchaseDetails }) {
	const orders = [...new Map(purchase.tickets.map((t) => [t.registration.id, t.registration])).values()];
	const paid = purchase.installments.filter((i) => i.status === 'paid').length;
	return (
		<Card>
			<Heading small>Pagamento</Heading>
			{orders.map((order) => {
				const method = (order.payment_method || '').toUpperCase();
				const card = ['CREDIT_CARD', 'CARD', 'CREDIT'].includes(method);
				return (
					<View key={order.id} style={{ gap: 8 }}>
						<Label>
							{order.is_installment_payment
								? 'Pix parcelado'
								: card
									? `Cartão de crédito${(order.card_installments ?? 1) > 1 ? ` · ${order.card_installments}x` : ''}`
									: method === 'BOLETO'
										? 'Boleto'
										: method === 'PIX'
											? 'Pix'
											: order.payment_status === 'free'
												? 'Gratuito'
												: 'Pagamento'}
						</Label>
						{card ? (
							<Label muted>
								As parcelas são cobradas na fatura do seu cartão. O ingresso é liberado após a aprovação da compra.
							</Label>
						) : order.is_installment_payment ? (
							<Label muted>O ingresso é liberado após o pagamento de todas as parcelas do Pix.</Label>
						) : null}
					</View>
				);
			})}
			{purchase.installments.length ? (
				<>
					<Label>
						{paid} de {purchase.installments.length} parcelas pagas
					</Label>
					{purchase.installments.map((i) => (
						<View key={i.id} style={s.between}>
							<View style={{ flex: 1 }}>
								<Label>
									Parcela {i.installment_number} · {money(i.amount)}
								</Label>
								<Label muted style={{ fontSize: 12 }}>
									Vencimento {dateLabel(`${i.due_date.slice(0, 10)}T12:00:00Z`)}
								</Label>
							</View>
							<Badge
								label={
									i.status === 'paid'
										? 'Paga'
										: i.status === 'overdue'
											? 'Em atraso'
											: i.status === 'cancelled'
												? 'Cancelada'
												: 'A pagar'
								}
								tone={i.status === 'paid' ? 'success' : 'warning'}
							/>
						</View>
					))}
				</>
			) : null}
			<View style={s.between}>
				<Label>Total da compra</Label>
				<Heading small>{money(orders.reduce((sum, order) => sum + (order.total_amount ?? 0), 0))}</Heading>
			</View>
		</Card>
	);
}
