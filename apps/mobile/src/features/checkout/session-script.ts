import { safeDestination } from './policy';

/** Runs in the first-party page, never in the checkout or a third-party document. */
export function createBrowserSessionScript(webUrl: string, accessToken: string, destination: string): string {
	if (!safeDestination(destination)) throw new Error('Destino indisponível.');
	const endpoint = new URL('/api/auth/mobile/web-session', webUrl).href;
	return `(() => {
		if (window.location.href !== ${JSON.stringify(endpoint)}) return;
		const form = document.getElementById('flouvi-mobile-session');
		if (!form || form.action !== ${JSON.stringify(endpoint)} || form.method !== 'post') {
			window.ReactNativeWebView?.postMessage('flouvi:browser-session-error');
			return;
		}
		if (form.dataset.submitting) return;
		form.elements.namedItem('access_token').value = ${JSON.stringify(accessToken)};
		form.elements.namedItem('destination').value = ${JSON.stringify(destination)};
		form.dataset.submitting = 'true';
		form.requestSubmit();
	})(); true;`;
}
