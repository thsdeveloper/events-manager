import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { NominalTicket } from '@events-manager/contracts';
import { useAuth } from '../../features/auth/AuthProvider';
import { groupTickets, isPaid } from '../../features/tickets/model';
import { imageUrl } from '../../features/events/model';
import { api } from '../../shared/api';
import { config } from '../../shared/config';
import { colors as c, dateLabel, fonts } from '../../shared/theme';
import { Badge, Button, Card, Empty, Heading, Label, Loading, Notice, Screen, s } from '../../shared/ui';
export default function Wallet() {
	const { user, ready } = useAuth();
	const [past, setPast] = useState(false);
	const query = useQuery({
		queryKey: ['tickets', user?.id],
		queryFn: () => api.request<NominalTicket[]>('/api/user/tickets'),
		enabled: Boolean(user),
		staleTime: 15_000,
	});
	if (!ready)
		return (
			<Screen title="Meus ingressos">
				<Loading />
			</Screen>
		);
	if (!user)
		return (
			<Screen title="Meus ingressos">
				<Empty
					title="Seu lugar está aqui"
					message="Entre na sua conta para ver suas compras e apresentar seus ingressos na entrada."
					action={<Button label="Entrar na minha conta" onPress={() => router.push('/login')} />}
				/>
			</Screen>
		);
	const groups = groupTickets(query.data ?? []).filter((group) => {
		const event = group.tickets[0].event;
		return new Date(event.end_date || event.start_date).getTime() < Date.now() === past;
	});
	return (
		<Screen title="Meus ingressos" scroll={false}>
			<FlatList
				data={groups}
				keyExtractor={(item) => item.id}
				contentContainerStyle={s.content}
				refreshing={query.isRefetching}
				onRefresh={() => void query.refetch()}
				ListHeaderComponent={
					<View style={s.section}>
						<Heading>Momentos que esperam por você.</Heading>
						<Label muted>Seus ingressos, pagamentos e participantes em um só lugar.</Label>
						<View style={s.row}>
							<Button label="Próximos" secondary={past} onPress={() => setPast(false)} />
							<Button label="Anteriores" secondary={!past} onPress={() => setPast(true)} />
						</View>
						{query.isError ? (
							<>
								<Notice message="Não foi possível atualizar seus ingressos." />
								<Button secondary label="Tentar novamente" onPress={() => void query.refetch()} />
							</>
						) : null}
					</View>
				}
				ListEmptyComponent={
					query.isPending ? (
						<Loading />
					) : query.isError ? undefined : (
						<Empty
							title={past ? 'Suas memórias começam aqui' : 'Vamos viver algo novo?'}
							message={
								past
									? 'Os eventos já realizados aparecerão nesta lista.'
									: 'Você ainda não tem ingressos para os próximos eventos.'
							}
							action={<Button label="Explorar eventos" onPress={() => router.navigate('/')} />}
						/>
					)
				}
				renderItem={({ item }) => {
					const first = item.tickets[0];
					const cover = imageUrl(first.event.cover_image, config.apiUrl);
					const paid = item.tickets.every(isPaid);
					const cancelled = item.tickets.every(
						(t) =>
							['cancelled', 'refunded'].includes(t.registration.status ?? '') ||
							t.registration.payment_status === 'refunded',
					);
					const checked = item.tickets.every((t) => t.check_in_date);
					const missing = item.tickets.filter((t) => t.can_edit_attendee && !t.attendee_name).length;
					return (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`Ver ingressos de ${first.event.title}`}
							onPress={() => router.push({ pathname: '/ingressos/[id]', params: { id: item.id } })}
						>
							<Card style={{ padding: 0, overflow: 'hidden' }}>
								{cover ? (
									<Image source={{ uri: cover }} style={{ height: 130, width: '100%' }} contentFit="cover" />
								) : null}
								<View style={{ padding: 20, gap: 14 }}>
									<View style={s.between}>
										<Badge
											label={
												cancelled
													? 'Cancelado'
													: checked
														? 'Entrada registrada'
														: paid
															? 'Confirmado'
															: 'Pagamento pendente'
											}
											tone={paid || checked ? 'success' : 'warning'}
										/>
										<Label muted style={{ fontSize: 12 }}>
											{item.tickets.length} {item.tickets.length === 1 ? 'ingresso' : 'ingressos'}
										</Label>
									</View>
									<Heading small>{first.event.title}</Heading>
									<Label muted>
										{dateLabel(first.event.start_date)} · {first.event.location_name || 'Online'}
									</Label>
									{missing ? (
										<Badge label={`${missing} participante${missing > 1 ? 's' : ''} a informar`} tone="warning" />
									) : null}
									<View style={[s.between, { borderTopWidth: 1, borderColor: c.line, paddingTop: 14 }]}>
										<Label style={{ fontFamily: fonts.bold, color: c.violet }}>
											{paid ? 'Abrir meus ingressos' : 'Ver compra e pagamento'}
										</Label>
										<Feather name="arrow-right" color={c.violet} size={20} />
									</View>
								</View>
							</Card>
						</Pressable>
					);
				}}
			/>
		</Screen>
	);
}
