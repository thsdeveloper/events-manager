import { act, render, screen, userEvent } from '@testing-library/react-native';
import type { WebViewProps } from 'react-native-webview';
import { BrowserFrame } from './BrowserFrame';
import { config } from '../../shared/config';
import * as WebBrowser from 'expo-web-browser';

let mockBrowser: WebViewProps;
jest.mock('react-native-webview', () => ({
	WebView: (props: WebViewProps) => {
		mockBrowser = props;
		return props.startInLoadingState ? props.renderLoading?.() : null;
	},
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }) }));

it('opens a first-party GET page before transferring credentials inside the WebView', async () => {
	await render(<BrowserFrame accessToken="native-secret" destination="/eventos/congresso/checkout" />);
	expect(screen.getByLabelText('Carregando')).toBeTruthy();
	expect(mockBrowser.source).toEqual({ uri: `${config.webUrl}/api/auth/mobile/web-session` });
	expect(JSON.stringify(mockBrowser.source)).not.toContain('native-secret');
	expect(mockBrowser.injectedJavaScript).toBeTruthy();
	expect(mockBrowser.onMessage).toBeDefined();
});

it('explains an authorization failure instead of blaming the customer connection', async () => {
	await render(<BrowserFrame accessToken="native-secret" destination="/perfil" />);
	await act(() =>
		mockBrowser.onHttpError?.({
			nativeEvent: { statusCode: 403, url: `${config.webUrl}/api/auth/mobile/web-session` },
		} as Parameters<NonNullable<WebViewProps['onHttpError']>>[0]),
	);
	expect(screen.getByText(/autorizar/i)).toBeTruthy();
	expect(screen.queryByText(/Confira sua conexão/)).toBeNull();
	await userEvent.setup().press(screen.getByRole('button', { name: 'Tentar novamente' }));
	expect(screen.queryByText(/autorizar/i)).toBeNull();
	expect(mockBrowser.source).toEqual({ uri: `${config.webUrl}/api/auth/mobile/web-session` });
});

it('shows a connection error only when the WebView cannot load the page', async () => {
	await render(<BrowserFrame accessToken="native-secret" destination="/perfil" />);
	await act(() =>
		mockBrowser.onError?.({ nativeEvent: { description: 'Offline' } } as Parameters<
			NonNullable<WebViewProps['onError']>
		>[0]),
	);
	expect(screen.getByText(/conexão/i)).toBeTruthy();
});

it.each([
	[401, /sessão expirou/i],
	[429, /Muitas tentativas/i],
	[503, /temporariamente indisponível/i],
] as const)('explains HTTP %s with the next action available to the customer', async (statusCode, message) => {
	await render(<BrowserFrame accessToken="native-secret" destination="/perfil" />);
	await act(() =>
		mockBrowser.onHttpError?.({ nativeEvent: { statusCode } } as Parameters<
			NonNullable<WebViewProps['onHttpError']>
		>[0]),
	);
	expect(screen.getByText(message)).toBeTruthy();
});

it('only accepts setup failure messages from its first-party session page', async () => {
	await render(<BrowserFrame accessToken="native-secret" destination="/perfil" />);
	const emit = (url: string, data: string) =>
		act(() =>
			mockBrowser.onMessage?.({ nativeEvent: { url, data } } as Parameters<NonNullable<WebViewProps['onMessage']>>[0]),
		);
	await emit('https://evil.test', 'flouvi:browser-session-error');
	await emit(`${config.webUrl}/api/auth/mobile/web-session`, 'unrelated');
	expect(screen.queryByText(/preparar sua sessão/)).toBeNull();
	await emit(`${config.webUrl}/api/auth/mobile/web-session`, 'flouvi:browser-session-error');
	expect(screen.getByText(/preparar sua sessão/)).toBeTruthy();
});

it('keeps first-party navigation inside and opens an external HTTPS destination separately', async () => {
	await render(<BrowserFrame accessToken="native-secret" destination="/perfil" />);
	const navigate = (url: string) =>
		mockBrowser.onShouldStartLoadWithRequest?.({ url } as Parameters<
			NonNullable<WebViewProps['onShouldStartLoadWithRequest']>
		>[0]);
	expect(navigate('about:blank')).toBe(true);
	expect(navigate(`${config.webUrl}/perfil`)).toBe(true);
	expect(navigate('javascript:alert(1)')).toBe(false);
	await act(async () => {
		expect(navigate('https://checkout.abacatepay.com/pay')).toBe(false);
	});
	expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.abacatepay.com/pay');
});

it('allows retry when the external browser cannot open', async () => {
	jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValueOnce(new Error('Unavailable'));
	await render(<BrowserFrame accessToken="native-secret" destination="/perfil" />);
	await act(async () => {
		mockBrowser.onShouldStartLoadWithRequest?.({ url: 'https://checkout.abacatepay.com/pay' } as Parameters<
			NonNullable<WebViewProps['onShouldStartLoadWithRequest']>
		>[0]);
	});
	expect(screen.getByText(/conexão/i)).toBeTruthy();
});
