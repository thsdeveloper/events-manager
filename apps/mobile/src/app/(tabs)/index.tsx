import { useEffect, useState } from 'react';
import { FlatList, View, TextInput } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Event } from '@events-manager/contracts';
import { api } from '../../shared/api';
import { Button, Empty, Heading, Label, Loading, Screen, s } from '../../shared/ui';
import { colors as c, fonts } from '../../shared/theme';
import { EventCard } from '../../features/events/EventCard';
import { useAuth } from '../../features/auth/AuthProvider';
type Page = { data: Event[]; pagination: { page: number; pageCount: number; total: number } };
export default function Explore() {
	const { user } = useAuth();
	const [search, setSearch] = useState('');
	const [term, setTerm] = useState('');
	useEffect(() => {
		const timeout = setTimeout(() => setTerm(search.trim()), 350);
		return () => clearTimeout(timeout);
	}, [search]);
	const query = useInfiniteQuery({
		queryKey: ['events', term],
		initialPageParam: 1,
		queryFn: ({ pageParam }) =>
			api.request<Page>(`/api/events/public?limit=12&page=${pageParam}&search=${encodeURIComponent(term)}`),
		getNextPageParam: (last) =>
			last.pagination.page < last.pagination.pageCount ? last.pagination.page + 1 : undefined,
	});
	const events = query.data?.pages.flatMap((p) => p.data) || [];
	return (
		<Screen scroll={false}>
			<FlatList
				data={events}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{
					padding: 22,
					gap: 20,
					paddingBottom: 30,
					maxWidth: 720,
					width: '100%',
					alignSelf: 'center',
				}}
				refreshing={query.isRefetching}
				onRefresh={() => void query.refetch()}
				renderItem={({ item }) => <EventCard event={item} />}
				ListHeaderComponent={
					<View style={{ gap: 24 }}>
						<View
							style={{
								backgroundColor: c.mist,
								borderRadius: 28,
								padding: 26,
								overflow: 'hidden',
								minHeight: 230,
								gap: 14,
							}}
						>
							<Image
								source={require('../../../assets/symbol.png')}
								contentFit="contain"
								style={{ position: 'absolute', width: 185, height: 185, right: -35, top: 52, opacity: 0.12 }}
							/>
							<Label style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: c.violet }}>
								VIVA O QUE CONECTA
							</Label>
							<Heading>Seu próximo{'\n'}bom encontro.</Heading>
							<Label muted style={{ maxWidth: 250 }}>
								Descubra experiências, reúna pessoas e faça parte.
							</Label>
						</View>
						<View style={s.section}>
							<Label muted>
								{user?.first_name
									? `Que bom ter você aqui, ${user.first_name}.`
									: 'O próximo momento especial começa aqui.'}
							</Label>
							<View style={[s.row, s.input, { paddingVertical: 0 }]}>
								<Feather name="search" color={c.violet} size={20} />
								<TextInput
									accessibilityLabel="Buscar eventos"
									placeholder="Qual experiência você procura?"
									placeholderTextColor={c.muted}
									value={search}
									onChangeText={setSearch}
									returnKeyType="search"
									style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: c.plum, minHeight: 52 }}
								/>
							</View>
						</View>
						<View style={[s.between, { marginBottom: 2 }]}>
							<Heading small>{term ? 'Resultados da busca' : 'Encontre seu lugar'}</Heading>
							<Label muted style={{ fontSize: 12 }}>
								{query.data?.pages[0].pagination.total ?? ''}{' '}
								{query.data?.pages[0].pagination.total === 1 ? 'evento' : 'eventos'}
							</Label>
						</View>
					</View>
				}
				ListEmptyComponent={
					query.isLoading ? (
						<Loading />
					) : (
						<Empty
							title={query.isError ? 'Vamos tentar novamente?' : 'Novos encontros estão chegando'}
							message={
								query.isError
									? 'Não conseguimos carregar os eventos agora. Verifique sua conexão.'
									: 'Experimente outro nome para encontrar o seu próximo evento.'
							}
							action={
								query.isError ? <Button label="Tentar novamente" onPress={() => void query.refetch()} /> : undefined
							}
						/>
					)
				}
				ListFooterComponent={
					query.hasNextPage ? (
						<Button
							label="Descobrir mais eventos"
							secondary
							onPress={() => void query.fetchNextPage()}
							loading={query.isFetchingNextPage}
						/>
					) : undefined
				}
			/>
		</Screen>
	);
}
