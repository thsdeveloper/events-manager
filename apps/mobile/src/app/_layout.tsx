import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/auth/AuthProvider';
import { colors } from '../shared/theme';
void SplashScreen.preventAutoHideAsync().catch(() => {});
const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true }, mutations: { retry: 0 } },
});
export default function RootLayout() {
	const [loaded, error] = useFonts({
		DMSans: require('../../assets/dm-sans-regular.ttf'),
		DMSansBold: require('../../assets/dm-sans-bold.ttf'),
	});
	useEffect(() => {
		if (loaded || error) void SplashScreen.hideAsync();
	}, [loaded, error]);
	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
		});
		return () => sub.remove();
	}, []);
	if (!loaded && !error) return null;
	return (
		<SafeAreaProvider>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<StatusBar style="dark" />
					<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen name="login" options={{ presentation: 'modal' }} />
						<Stack.Screen name="navegador" options={{ presentation: 'fullScreenModal' }} />
					</Stack>
				</AuthProvider>
			</QueryClientProvider>
		</SafeAreaProvider>
	);
}
