// Execute via playwright-cli run-code with a local authenticated browser session.
async (page) => {
	const origin = 'http://localhost:3004';
	await page.setViewportSize({ width: 1440, height: 1000 });
	const cases = [
		['/admin/participantes', 'Filtros de participantes', 'Buscar participantes'],
		['/admin/financeiro', 'Filtros financeiros', 'Busca'],
		['/admin/analises', 'Filtros de análises', null],
		['/super-admin/organizadores', 'Filtros de organizadores', 'Buscar organizadores'],
		['/super-admin/conteudo/paginas', 'Filtros de conteúdo', 'Buscar'],
		['/super-admin/conteudo/blog', 'Filtros de conteúdo', 'Buscar'],
		['/super-admin/conteudo/midia', 'Filtros de conteúdo', 'Buscar'],
		['/eventos', 'Filtros de eventos', 'Buscar eventos'],
	];
	const passed = [];
	for (const [path, title, search] of cases) {
		await page.goto(origin + path);
		await page.getByRole('button', { name: /^Filtros/ }).click();
		const sheet = page.getByRole('dialog', { name: title, exact: true });
		await sheet.waitFor();
		if (search) await sheet.getByLabel(search, { exact: true }).fill('Filtro descartado');
		await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
		await page.getByRole('button', { name: /^Filtros/ }).click();
		if (search && (await sheet.getByLabel(search, { exact: true }).inputValue()))
			throw new Error('Cancelled draft persisted: ' + path);
		if (path === '/admin/financeiro')
			await sheet.screenshot({ path: 'testsprite_tests/tmp/filters-finance-desktop.png', animations: 'disabled' });
		await page.setViewportSize({ width: 390, height: 844 });
		await sheet.screenshot({
			path: 'testsprite_tests/tmp/filters-' + path.split('/').at(-1) + '-mobile.png',
			animations: 'disabled',
		});
		const box = await sheet.boundingBox();
		if (!box || box.x < -1 || box.x + box.width > 391) throw new Error('Sheet overflows: ' + path);
		await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
		passed.push(path);
		await page.setViewportSize({ width: 1440, height: 1000 });
	}
	await page.goto(origin + '/super-admin/organizadores?search=Revisão&page=1');
	await page.getByRole('button', { name: /^Filtros/ }).click();
	await page.getByRole('combobox', { name: 'Status', exact: true }).click();
	await page.getByRole('option', { name: 'Ativos', exact: true }).click();
	if (new URL(page.url()).searchParams.has('status')) throw new Error('Filters applied before confirmation');
	await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
	await page.waitForURL((url) => url.searchParams.get('status') === 'active' && !url.searchParams.has('page'));
	await page.reload();
	await page.getByRole('button', { name: /^Filtros/ }).click();
	if ((await page.getByLabel('Buscar organizadores', { exact: true }).inputValue()) !== 'Revisão')
		throw new Error('Search was not restored from URL');
	await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
	await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
	await page.waitForURL(origin + '/super-admin/organizadores');

	const events = [
		{
			id: '11111111-1111-4111-8111-111111111111',
			title: 'Evento publicado de teste',
			status: 'published',
			event_type: 'online',
			is_free: true,
			featured: true,
			start_date: '2027-01-01T12:00:00Z',
		},
		{
			id: '22222222-2222-4222-8222-222222222222',
			title: 'Evento rascunho de teste',
			status: 'draft',
			event_type: 'in_person',
			is_free: false,
			featured: false,
			start_date: '2027-01-01T12:00:00Z',
		},
	];
	await page.route('**/api/events', (route) =>
		route.request().method() === 'GET' ? route.fulfill({ json: { data: events } }) : route.continue(),
	);
	await page.goto(origin + '/admin/eventos');
	await page.getByRole('button', { name: /^Filtros/ }).click();
	await page.getByRole('checkbox', { name: 'Publicado', exact: true }).check();
	await page.getByRole('checkbox', { name: 'Online', exact: true }).check();
	await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
	await page.getByRole('link', { name: 'Evento publicado de teste', exact: true }).waitFor();
	if (await page.getByRole('link', { name: 'Evento rascunho de teste', exact: true }).count())
		throw new Error('Table filtering failed');
	await page.getByRole('button', { name: /^Filtros/ }).click();
	const eventsSheet = page.getByRole('dialog', { name: 'Filtros de eventos', exact: true });
	await eventsSheet.screenshot({
		path: 'testsprite_tests/tmp/filters-admin-events-desktop.png',
		animations: 'disabled',
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await eventsSheet.screenshot({
		path: 'testsprite_tests/tmp/filters-admin-events-mobile.png',
		animations: 'disabled',
	});
	await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
	await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
	await page.getByRole('link', { name: 'Evento rascunho de teste', exact: true }).waitFor();
	await page.unroute('**/api/events');
	passed.push('/admin/eventos');
	return {
		passed,
		desktopAndMobile: true,
		cancelDiscardsDraft: true,
		urlRestoration: true,
		paginationReset: true,
		tableFilteringAndReset: true,
	};
};
