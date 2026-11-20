import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import type { TicketPurchaseDetails } from '@events-manager/contracts';
import { api } from '../../shared/api';
import { useAuth } from '../../features/auth/AuthProvider';
import { TicketAdmission } from '../../features/tickets/TicketAdmission';
import { PaymentSummary } from '../../features/tickets/PaymentSummary';
import { isPaid } from '../../features/tickets/model';
import { Badge, Button, Heading, Label, Loading, Notice, Screen, s } from '../../shared/ui';
export default function Purchase() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { user, ready } = useAuth();
	const query = useQuery({
		queryKey: ['purchase', user?.id, id],
		queryFn: () => api.request<TicketPurchaseDetails>(`/api/user/purchases/${encodeURIComponent(id)}`),
		enabled: Boolean(user && id),
		staleTime: 0,
		refetchInterval: (q) =>
			q.state.data?.tickets.some((t) => !isPaid(t) && t.registration.status === 'pending') ? 15_000 : false,
	});
	useEffect(() => {
		if (ready && !user) router.replace('/login');
	}, [ready, user]);
	if (query.isPending)
		return (
			<Screen back title="Sua compra">
				<Loading />
			</Screen>
		);
	const purchase = query.data;
	const first = purchase?.tickets[0];
	if (!purchase || !first)
		return (
			<Screen back title="Sua compra">
				<Notice message="Não foi possível abrir esta compra. Confira sua conta e conexão." />
				<Button label="Tentar novamente" onPress={() => void query.refetch()} />
			</Screen>
		);
	const paid = purchase.tickets.every(isPaid);
	const cancelled = purchase.tickets.every(
		(t) => t.registration.status === 'cancelled' || t.registration.payment_status === 'refunded',
	);
	const owner = purchase.tickets.some((t) => t.purchased_by_me);
	const manage = () =>
		router.push({ pathname: '/navegador', params: { destination: `/perfil/ingressos/${purchase.id}` } });
	return (
		<Screen back title="Sua compra">
			<Badge
				label={cancelled ? 'Compra cancelada' : paid ? 'Compra confirmada' : 'Aguardando pagamento'}
				tone={paid ? 'success' : 'warning'}
			/>
			<Heading>{first.event.title}</Heading>
			<Button
				secondary
				label="Ver evento"
				icon="external-link"
				onPress={() => router.push({ pathname: '/eventos/[slug]', params: { slug: first.event.slug } })}
			/>
			{owner ? <PaymentSummary purchase={purchase} /> : null}
			{!paid && !cancelled && owner ? (
				<Button label="Ver QR Pix ou continuar pagamento" icon="credit-card" onPress={manage} />
			) : null}
			<View style={s.between}>
				<Heading small>{purchase.tickets.length === 1 ? 'Seu ingresso' : 'Seus ingressos'}</Heading>
				<Badge label={`${purchase.tickets.length} ${purchase.tickets.length === 1 ? 'ingresso' : 'ingressos'}`} />
			</View>
			{purchase.tickets.map((ticket) => (
				<TicketAdmission
					key={ticket.id}
					ticket={ticket}
					onEditParticipant={ticket.can_edit_attendee && !ticket.is_buyer ? manage : undefined}
				/>
			))}
			{paid && first.event.online_url && /^https:\/\//.test(first.event.online_url) ? (
				<Button
					label="Acessar evento online"
					icon="video"
					onPress={() => void WebBrowser.openBrowserAsync(first.event.online_url!).catch(() => {})}
				/>
			) : null}
			{owner ? (
				<Button secondary label="Comprovante, PDF e opções da compra" icon="file-text" onPress={manage} />
			) : null}
			<Button
				secondary
				label="Atualizar situação da compra"
				icon="refresh-cw"
				loading={query.isRefetching}
				onPress={() => void query.refetch()}
			/>
			<Label muted style={{ fontSize: 11, textAlign: 'center' }}>
				Pedido {purchase.id}
			</Label>
		</Screen>
	);
}
