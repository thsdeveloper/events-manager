import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { Event } from '@events-manager/contracts';
import { Badge, Heading, Label, s } from '../../shared/ui';
import { colors as c, dateLabel } from '../../shared/theme';
import { config } from '../../shared/config';
import { imageUrl } from './model';
export const EventCard = memo(function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
	const cover = imageUrl(event.cover_image, config.apiUrl);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Ver evento ${event.title}`}
			onPress={() => router.push({ pathname: '/eventos/[slug]', params: { slug: event.slug } })}
			style={[s.card, { padding: 0, overflow: 'hidden', gap: 0 }, compact && { width: 260 }]}
		>
			<View style={{ backgroundColor: c.mist, aspectRatio: compact ? 1.9 : 1.8 }}>
				{cover ? (
					<Image
						source={{ uri: cover }}
						contentFit="cover"
						transition={180}
						cachePolicy="memory-disk"
						style={{ height: '100%', width: '100%' }}
						accessibilityLabel={event.title}
					/>
				) : (
					<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
						<Image
							source={require('../../../assets/logo.png')}
							contentFit="contain"
							style={{ width: 130, height: 48 }}
						/>
					</View>
				)}
			</View>
			<View style={{ padding: 18, gap: 12 }}>
				<View style={s.between}>
					<Badge
						label={
							event.is_free
								? 'Gratuito'
								: typeof event.category_id === 'object' && event.category_id
									? event.category_id.name
									: 'Experiências'
						}
					/>
					<Feather name="arrow-up-right" size={20} color={c.violet} />
				</View>
				<Heading small>{event.title}</Heading>
				<View style={s.row}>
					<Feather name="calendar" size={14} color={c.violet} />
					<Label muted style={{ fontSize: 13 }}>
						{dateLabel(event.start_date)}
					</Label>
				</View>
				<View style={s.row}>
					<Feather name="map-pin" size={14} color={c.violet} />
					<Label muted style={{ fontSize: 13, flex: 1 }}>
						{event.location_name || 'Evento online'}
					</Label>
				</View>
			</View>
		</Pressable>
	);
});
