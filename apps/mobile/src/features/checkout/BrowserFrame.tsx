import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { config } from '../../shared/config';
import { Button, Loading, Notice } from '../../shared/ui';
import { browserNavigation } from './policy';
import { createBrowserSessionScript } from './session-script';
export type BrowserFrameProps = { accessToken: string; destination: string };
export function BrowserFrame({ accessToken, destination }: BrowserFrameProps) {
	const [error, setError] = useState('');
	const [attempt, setAttempt] = useState(0);
	const sessionUrl = `${config.webUrl}/api/auth/mobile/web-session`;
	const connectionError = 'Não foi possível abrir esta página. Confira sua conexão e tente novamente.';
	if (error)
		return (
			<View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
				<Notice message={error} />
				<Button
					label="Tentar novamente"
					onPress={() => {
						setError('');
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
			source={{ uri: sessionUrl }}
			injectedJavaScript={createBrowserSessionScript(config.webUrl, accessToken, destination)}
			injectedJavaScriptForMainFrameOnly
			onMessage={({ nativeEvent }) => {
				if (nativeEvent.url === sessionUrl && nativeEvent.data === 'flouvi:browser-session-error')
					setError('Não foi possível preparar sua sessão. Tente novamente.');
			}}
			onShouldStartLoadWithRequest={(request) => {
				if (request.url === 'about:blank') return true;
				const decision = browserNavigation(request.url, config.webUrl);
				if (decision === 'external')
					void WebBrowser.openBrowserAsync(request.url).catch(() => setError(connectionError));
				return decision === 'internal';
			}}
			onError={() => setError(connectionError)}
			onHttpError={(event) => {
				const { statusCode } = event.nativeEvent;
				if (statusCode === 401) setError('Sua sessão expirou. Volte ao aplicativo e entre novamente.');
				else if (statusCode === 403) setError('Não foi possível autorizar o acesso a esta página. Tente novamente.');
				else if (statusCode === 429) setError('Muitas tentativas. Aguarde e tente novamente.');
				else if (statusCode >= 400) setError('A página está temporariamente indisponível. Tente novamente.');
			}}
			setSupportMultipleWindows={false}
			javaScriptCanOpenWindowsAutomatically={false}
		/>
	);
}
