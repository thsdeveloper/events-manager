export const config = {
	apiUrl: (process.env.EXPO_PUBLIC_API_URL || 'https://flouvi-api-dev.fly.dev').replace(/\/$/, ''),
	webUrl: (process.env.EXPO_PUBLIC_WEB_URL || 'https://flouvi-dev.vercel.app').replace(/\/$/, ''),
};
