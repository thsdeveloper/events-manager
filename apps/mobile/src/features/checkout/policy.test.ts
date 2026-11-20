import { safeDestination, browserNavigation } from './policy';
describe('authenticated checkout navigation', () => {
	it.each([
		'/eventos/congresso-2027/checkout',
		'/perfil?section=personal',
		'/perfil/ingressos/397c3c17-97d8-40d4-ba46-81716cf00457',
	])('allows the customer destination %s', (path) => expect(safeDestination(path)).toBe(path));
	it.each([
		'https://evil.test',
		'//evil.test',
		'/admin',
		'/perfil/../admin',
		'/eventos/x/checkout?next=//evil.test',
		'/perfil?section=personal#x',
		undefined,
	])('rejects unintended destinations %s', (path) => expect(safeDestination(path)).toBeNull());
	it('keeps first-party pages inside and opens external HTTPS pages separately', () => {
		expect(browserNavigation('https://flouvi.test/eventos/x', 'https://flouvi.test')).toBe('internal');
		expect(browserNavigation('https://checkout.abacatepay.com/pay', 'https://flouvi.test')).toBe('external');
	});
	it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'http://evil.test', 'intent://evil'])(
		'blocks untrusted protocols %s',
		(url) => expect(browserNavigation(url, 'https://flouvi.test')).toBe('blocked'),
	);
});
