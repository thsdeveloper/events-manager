async (page) => {
	const base = 'http://localhost:3004';
	const checks = [];
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const check = (condition, message) => {
		if (!condition) throw new Error(message);
	};
	await page.goto(base + '/admin/dashboard');
	const goPlatform = page.locator('header').getByRole('link', { name: 'Painel superadmin' });
	check((await goPlatform.getAttribute('href')) === '/super-admin', 'Organizer header switch missing');
	await goPlatform.click();
	await page.waitForURL('**/super-admin');
	const goOrganizer = page.locator('header').getByRole('link', { name: 'Painel do organizador' });
	await goOrganizer.click();
	await page.waitForURL('**/admin/dashboard');
	checks.push('Header navigation in both directions');
	await page.goto(base + '/login');
	await page.waitForURL('**/perfil?section=overview');
	checks.push('Authenticated login redirects to overview');
	for (const theme of ['light', 'dark']) {
		await page.evaluate((mode) => localStorage.setItem('theme', mode), theme);
		for (const width of [1440, 390, 320]) {
			await page.setViewportSize({ width, height: 900 });
			const response = await page.goto(base + '/pagina-inexistente-flouvi-check');
			await page.waitForFunction((mode) => document.documentElement.classList.contains(mode), theme);
			check(response.status() === 404, 'Not-found route must return HTTP 404');
			await page.getByRole('heading', { name: 'Esta página não existe' }).waitFor();
			check((await page.getByRole('main').getAttribute('id')) === 'main-content', 'Missing accessible main landmark');
			check((await page.locator('meta[name="robots"]').getAttribute('content')) === 'noindex', 'Missing noindex');
			check(
				(await page.getByRole('link', { name: 'Explorar eventos' }).getAttribute('href')) === '/eventos',
				'Missing events recovery link',
			);
			check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `404 overflow ${width}`);
			if (width !== 320)
				await page.screenshot({ path: `testsprite_tests/tmp/not-found-${theme}-${width}.png`, fullPage: true });
			checks.push(`404 ${theme}/${width}`);
		}
	}
	await page.context().clearCookies();
	await page.goto(base + '/login');
	await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
	check(new URL(page.url()).pathname === '/login', 'Anonymous login redirected');
	checks.push('Anonymous visitor keeps login form');
	await page
		.context()
		.addCookies([{ name: 'access_token', value: 'invalid-ui-session', domain: 'localhost', path: '/' }]);
	await page.goto(base + '/login');
	await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
	check(new URL(page.url()).pathname === '/login', 'Invalid cookie caused a redirect loop');
	checks.push('Invalid cookie keeps login form');
	return { checks, errors };
};
