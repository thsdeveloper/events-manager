import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../features/auth/AuthProvider';
import { useSavedEvents } from '../../features/events/useSavedEvents';
import { EventCard } from '../../features/events/EventCard';
import { Screen, Heading, Label, Empty, Button, Loading } from '../../shared/ui';
export default function Saved() {
	const { user } = useAuth();
	const query = useSavedEvents(user?.id);
	return (
		<Screen scroll={false}>
			<FlatList
				contentContainerStyle={{
					padding: 22,
					gap: 20,
					paddingBottom: 40,
					maxWidth: 720,
					width: '100%',
					alignSelf: 'center',
				}}
				data={query.data || []}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <EventCard event={item} />}
				ListHeaderComponent={
					<>
						<Heading>Vale guardar.</Heading>
						<Label muted>Seus próximos planos, todos em um lugar.</Label>
					</>
				}
				ListEmptyComponent={
					query.isLoading ? (
						<Loading />
					) : (
						<Empty
							title="Seus favoritos começam aqui"
							message="Toque no coração de um evento para guardar e voltar quando quiser."
							action={<Button label="Explorar eventos" onPress={() => router.push('/')} />}
						/>
					)
				}
			/>
		</Screen>
	);
}
