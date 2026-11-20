import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiClient, type Session, type SessionStorage } from './client';
import { config } from '../config';
let memory: Session | null = null;
const storage: SessionStorage = {
	async read() {
		if (Platform.OS === 'web') return memory;
		const [accessToken, refreshToken] = await Promise.all([
			SecureStore.getItemAsync('flouvi.access'),
			SecureStore.getItemAsync('flouvi.refresh'),
		]);
		return accessToken && refreshToken ? { accessToken, refreshToken, expiresIn: 3600 } : null;
	},
	async write(session) {
		if (Platform.OS === 'web') {
			memory = session;
			return;
		}
		if (session)
			await Promise.all([
				SecureStore.setItemAsync('flouvi.access', session.accessToken),
				SecureStore.setItemAsync('flouvi.refresh', session.refreshToken),
			]);
		else
			await Promise.all([SecureStore.deleteItemAsync('flouvi.access'), SecureStore.deleteItemAsync('flouvi.refresh')]);
	},
};
export const api = new ApiClient(config.apiUrl, storage, (...args) => fetch(...args));
