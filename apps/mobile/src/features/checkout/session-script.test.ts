import { createBrowserSessionScript } from './session-script';

const origin = 'https://flouvi.test';
const endpoint = `${origin}/api/auth/mobile/web-session`;
const destination = '/eventos/congresso/checkout';
function browser(url = endpoint) {
	const fields = { access_token: { value: '' }, destination: { value: '' } };
	const form = {
		action: endpoint,
		method: 'post',
		dataset: {} as Record<string, string>,
		elements: { namedItem: (name: keyof typeof fields) => fields[name] },
		requestSubmit: jest.fn(),
	};
	const document = { getElementById: jest.fn().mockReturnValue(form) };
	const window = { location: new URL(url), ReactNativeWebView: { postMessage: jest.fn() } };
	const run = (token = 'native-secret') =>
		new Function('window', 'document', createBrowserSessionScript(origin, token, destination))(window, document);
	return { window, document, form, fields, run };
}
it('submits credentials once from the loaded first-party document, keeping them out of the URL', () => {
	const page = browser();
	page.run();
	page.run();
	expect(page.fields).toEqual({ access_token: { value: 'native-secret' }, destination: { value: destination } });
	expect(page.form.requestSubmit).toHaveBeenCalledTimes(1);
	expect(page.window.location.href).toBe(endpoint);
});
it.each(['https://evil.test/api/auth/mobile/web-session', `${origin}/eventos/congresso/checkout`, 'about:blank'])(
	'never injects credentials into %s',
	(url) => {
		const page = browser(url);
		page.run();
		expect(page.document.getElementById).not.toHaveBeenCalled();
		expect(page.form.requestSubmit).not.toHaveBeenCalled();
		expect(page.fields.access_token.value).toBe('');
	},
);
it('preserves token text without executing it as JavaScript', () => {
	const page = browser();
	const token = 'quote"\n</script>; document.getElementById = null;';
	page.run(token);
	expect(page.fields.access_token.value).toBe(token);
	expect(page.form.requestSubmit).toHaveBeenCalledTimes(1);
});
it('fails safely when the bridge page cannot accept the credentials', () => {
	const page = browser();
	page.document.getElementById.mockReturnValue(null);
	page.run();
	expect(page.window.ReactNativeWebView.postMessage).toHaveBeenCalledWith('flouvi:browser-session-error');
});
it('does not send credentials through a modified form action', () => {
	const page = browser();
	page.form.action = 'https://evil.test';
	page.run();
	expect(page.form.requestSubmit).not.toHaveBeenCalled();
	expect(page.fields.access_token.value).toBe('');
});
it('rejects unintended destinations before generating a browser script', () => {
	expect(() => createBrowserSessionScript(origin, 'native-secret', '//evil.test')).toThrow();
});
