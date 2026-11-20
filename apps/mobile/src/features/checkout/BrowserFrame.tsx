import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { config } from '../../shared/config';
import { Button, Loading, Notice } from '../../shared/ui';
import { browserNavigation } from './policy';
export type BrowserFrameProps = { accessToken: string; destination: string };
export function BrowserFrame({ accessToken, destination }: BrowserFrameProps) {
	const [error, setError] = useState(false);
	const [attempt, setAttempt] = useState(0);
	if (error)
		return (
			<View style={{ padding: 24, gap: 16 }}>
				<Notice message="Não foi possível abrir esta página. Confira sua conexão e tente novamente." />
				<Button
					label="Tentar novamente"
					onPress={() => {
						setError(false);
						setAttempt((v) => v + 1);
					}}
				/>
			</View>
		);
	return (
		<WebView
			key={attempt}
			incognito
			sharedCookiesEnabled={false}
			thirdPartyCookiesEnabled={false}
			startInLoadingState
			renderLoading={() => <Loading />}
			style={{ flex: 1 }}
			originWhitelist={['https://*', 'http://localhost:*']}
			source={{
				uri: `${config.webUrl}/api/auth/mobile/web-session`,
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: `access_token=${encodeURIComponent(accessToken)}&destination=${encodeURIComponent(destination)}`,
			}}
			onShouldStartLoadWithRequest={(request) => {
				if (request.url === 'about:blank') return true;
				const decision = browserNavigation(request.url, config.webUrl);
				if (decision === 'external') void WebBrowser.openBrowserAsync(request.url).catch(() => setError(true));
				return decision === 'internal';
			}}
			onError={() => setError(true)}
			onHttpError={(event) => {
				if (event.nativeEvent.statusCode >= 400) setError(true);
			}}
			setSupportMultipleWindows={false}
			javaScriptCanOpenWindowsAutomatically={false}
		/>
	);
}
