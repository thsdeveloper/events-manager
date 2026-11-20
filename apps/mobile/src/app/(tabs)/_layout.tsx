import { Tabs } from 'expo-router/js-tabs';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../shared/theme';
export default function TabLayout() {
	const insets = useSafeAreaInsets();
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.violet,
				tabBarInactiveTintColor: colors.muted,
				tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10 },
				tabBarStyle: {
					borderTopColor: colors.line,
					backgroundColor: colors.white,
					height: 64 + insets.bottom,
					paddingBottom: Math.max(insets.bottom, 8),
					paddingTop: 8,
				},
				tabBarItemStyle: { paddingVertical: 0 },
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Explorar',
					tabBarIcon: ({ focused, size }) => (
						<Feather name="compass" color={focused ? colors.violet : colors.muted} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="ingressos"
				options={{
					title: 'Ingressos',
					tabBarIcon: ({ focused, size }) => (
						<Feather name="grid" color={focused ? colors.violet : colors.muted} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="salvos"
				options={{
					title: 'Salvos',
					tabBarIcon: ({ focused, size }) => (
						<Feather name="heart" color={focused ? colors.violet : colors.muted} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="conta"
				options={{
					title: 'Minha conta',
					tabBarIcon: ({ focused, size }) => (
						<Feather name="user" color={focused ? colors.violet : colors.muted} size={size} />
					),
				}}
			/>
		</Tabs>
	);
}
