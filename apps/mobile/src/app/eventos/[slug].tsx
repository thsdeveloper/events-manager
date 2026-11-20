import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import type { Event, EventTicket } from '@events-manager/contracts';
import { api } from '../../shared/api';
import { config } from '../../shared/config';
import { colors as c, dateLabel, timeLabel, money, fonts } from '../../shared/theme';
import { Badge, Button, Card, Heading, Label, Loading, Notice, Screen, s } from '../../shared/ui';
import { imageUrl, plainText } from '../../features/events/model';
import { purchaseAvailability } from '../../features/events/availability';
import { EventCard } from '../../features/events/EventCard';
import { useSavedEvents } from '../../features/events/useSavedEvents';
import { useAuth } from '../../features/auth/AuthProvider';
export default function EventDetails() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const { user } = useAuth();
	const saved = useSavedEvents(user?.id);
	const insets = useSafeAreaInsets();
	const [notice, setNotice] = useState('');
	const query = useQuery({
		queryKey: ['event', slug],
		queryFn: () => api.request<Event>(`/api/events/slug/${encodeURIComponent(slug)}`),
		enabled: Boolean(slug),
		staleTime: 0,
	});
	const event = query.data;
	const organizer = event && typeof event.organizer_id === 'object' ? event.organizer_id : null;
	const related = useQuery({
		queryKey: ['organizer-events', organizer?.id, event?.id],
		queryFn: () =>
			api.request<{ data: Event[] }>(
				`/api/events/public?organizer_id=${organizer!.id}&exclude_id=${event!.id}&limit=4`,
			),
		enabled: Boolean(organizer?.id && event?.id),
	});
	const open = async (url: string) => {
		try {
			if (new URL(url).protocol === 'https:') await WebBrowser.openBrowserAsync(url);
		} catch {
			setNotice('Não foi possível abrir o link. Tente novamente.');
		}
	};
	if (query.isPending)
		return (
			<Screen back title="Evento">
				<Loading />
			</Screen>
		);
	if (!event)
		return (
			<Screen back title="Evento">
				<Notice message="Não foi possível carregar este evento." />
				<Button label="Tentar novamente" onPress={() => void query.refetch()} />
			</Screen>
		);
	const cover = imageUrl(event.cover_image, config.apiUrl);
	const availability = purchaseAvailability(event);
	const tickets = (event.tickets ?? []).filter((t): t is EventTicket => typeof t !== 'string');
	const price = tickets
		.filter((t) => t.status !== 'inactive' && t.visibility !== 'manual' && t.visibility !== 'invited_only')
		.reduce((min, t) => Math.min(min, t.buyer_price ?? t.price), Infinity);
	const bookmarked = saved.has(event.id);
	const eventUrl = `${config.webUrl}/eventos/${event.slug}`;
	const purchase = () =>
		user
			? router.push({ pathname: '/navegador', params: { destination: `/eventos/${event.slug}/checkout` } })
			: router.push({ pathname: '/login', params: { event: event.slug } });
	const address =
		event.location_address ||
		[
			event.location_street,
			event.location_number,
			event.location_neighborhood,
			event.location_city,
			event.location_state,
		]
			.filter(Boolean)
			.join(', ');
	const maps =
		event.latitude != null && event.longitude != null
			? `${event.latitude},${event.longitude}`
			: [event.location_name, address].filter(Boolean).join(', ');
	return (
		<Screen
			back
			title="Descubra o evento"
			scroll={false}
			action={
				<View style={s.row}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={bookmarked ? 'Remover dos salvos' : 'Salvar evento'}
						style={s.iconButton}
						onPress={() => void saved.toggle(event).catch(() => setNotice('Não foi possível salvar este evento.'))}
					>
						<Feather name="heart" size={20} color={bookmarked ? c.danger : c.violet} />
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Compartilhar evento"
						style={s.iconButton}
						onPress={() => void Share.share({ message: `${event.title}\n${eventUrl}`, url: eventUrl }).catch(() => {})}
					>
						<Feather name="share-2" size={20} color={c.violet} />
					</Pressable>
				</View>
			}
		>
			<ScrollView contentContainerStyle={[s.content, { paddingTop: 16 }]}>
				<View style={{ aspectRatio: 1.6, backgroundColor: c.mist, borderRadius: 22, overflow: 'hidden' }}>
					<Image
						source={cover ? { uri: cover } : require('../../../assets/logo.png')}
						contentFit="contain"
						transition={180}
						style={{ width: '100%', height: '100%' }}
						accessibilityLabel={event.cover_image_alt || event.title}
					/>
				</View>
				<View style={s.section}>
					<Badge
						label={
							event.event_type === 'online'
								? 'Online'
								: event.event_type === 'hybrid'
									? 'Presencial e online'
									: 'Presencial'
						}
					/>
					<Heading>{event.title}</Heading>
					{event.short_description ? <Label muted>{event.short_description}</Label> : null}
				</View>
				<Card>
					<View style={s.row}>
						<Feather name="calendar" color={c.violet} size={24} />
						<View style={{ flex: 1 }}>
							<Label style={{ fontFamily: fonts.bold }}>
								{dateLabel(event.start_date)} · {timeLabel(event.start_date)}
							</Label>
							<Label muted style={{ fontSize: 12 }}>
								Até {dateLabel(event.end_date)}, às {timeLabel(event.end_date)} · horário de Brasília
							</Label>
						</View>
					</View>
					<View style={s.row}>
						<Feather name="map-pin" color={c.violet} size={24} />
						<View style={{ flex: 1 }}>
							<Label style={{ fontFamily: fonts.bold }}>
								{event.location_tbd ? 'Local a confirmar' : event.location_name || 'Evento online'}
							</Label>
							{address ? (
								<Label muted style={{ fontSize: 13 }}>
									{address}
								</Label>
							) : null}
						</View>
					</View>
					{event.event_type !== 'online' && !event.location_tbd && maps ? (
						<Button
							secondary
							label="Como chegar"
							icon="navigation"
							onPress={() => void open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(maps)}`)}
						/>
					) : null}
				</Card>
				{event.description ? (
					<View style={s.section}>
						<Heading small>Sobre o evento</Heading>
						<Label>{plainText(event.description)}</Label>
					</View>
				) : null}
				{event.video_url ? (
					<Button
						secondary
						label="Assista ao vídeo do evento"
						icon="play-circle"
						onPress={() => void open(event.video_url!)}
					/>
				) : null}
				{tickets.length ? (
					<View style={s.section}>
						<Heading small>Encontre seu ingresso</Heading>
						{tickets
							.filter((t) => t.status !== 'inactive' && t.visibility !== 'manual' && t.visibility !== 'invited_only')
							.map((t) => (
								<Card key={t.id}>
									<View style={s.between}>
										<View style={{ flex: 1, gap: 6 }}>
											<Label style={{ fontFamily: fonts.bold }}>{t.title}</Label>
											{t.description ? (
												<Label muted style={{ fontSize: 13 }}>
													{plainText(t.description)}
												</Label>
											) : null}
										</View>
										<Label style={{ fontFamily: fonts.bold, color: c.violet }}>
											{(t.buyer_price ?? t.price) === 0 ? 'Grátis' : money(t.buyer_price ?? t.price)}
										</Label>
									</View>
									{t.status === 'sold_out' || t.quantity <= (t.quantity_sold ?? 0) ? (
										<Badge label="Esgotado" tone="warning" />
									) : null}
									{t.allow_pix_installments ? (
										<Label muted style={{ fontSize: 12 }}>
											Pix parcelado disponível. Ingresso liberado após a quitação.
										</Label>
									) : null}
									{t.allow_installments ? (
										<Label muted style={{ fontSize: 12 }}>
											Permite parcelamento no cartão.
										</Label>
									) : null}
								</Card>
							))}
						<Label muted style={{ fontSize: 12 }}>
							Valores com taxa de serviço. Disponibilidade e condições finais são confirmadas no checkout.
						</Label>
					</View>
				) : null}
				{organizer ? (
					<Card>
						<Badge label="QUEM FAZ ACONTECER" />
						<Heading small>{organizer.name}</Heading>
						{organizer.description ? <Label muted>{plainText(organizer.description)}</Label> : null}
						{organizer.website ? (
							<Button
								secondary
								label="Site da organização"
								icon="external-link"
								onPress={() => void open(organizer.website!)}
							/>
						) : null}
					</Card>
				) : null}
				<Button
					secondary
					label="Ver página completa do evento"
					icon="external-link"
					onPress={() => void open(eventUrl)}
				/>
				<Notice message={notice} />
				{related.data?.data.length ? (
					<View style={s.section}>
						<Heading small>Mais dessa organização</Heading>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
							{related.data.data.map((e) => (
								<EventCard key={e.id} event={e} compact />
							))}
						</ScrollView>
					</View>
				) : null}
			</ScrollView>
			<View
				style={{
					paddingHorizontal: 22,
					paddingTop: 14,
					paddingBottom: Math.max(insets.bottom, 16),
					backgroundColor: c.white,
					borderTopWidth: 1,
					borderColor: c.line,
					gap: 10,
				}}
			>
				<View style={s.between}>
					<Label muted>{event.is_free ? 'Entrada gratuita' : 'Ingressos a partir de'}</Label>
					<Label style={{ fontFamily: fonts.bold, fontSize: 21 }}>
						{event.is_free ? 'Grátis' : Number.isFinite(price) ? money(price) : 'Ver opções'}
					</Label>
				</View>
				<Button label={availability.label} disabled={!availability.enabled} onPress={purchase} icon="arrow-right" />
			</View>
		</Screen>
	);
}
