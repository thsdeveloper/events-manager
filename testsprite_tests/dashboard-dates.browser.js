async (page) => {
	const base = 'http://localhost:3004';
	const checks = [];
	await page.clock.setFixedTime(new Date(2026, 10, 17, 12));
	const check = (condition, message) => {
		if (!condition) throw new Error(message);
	};
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(base + '/admin/financeiro');
	await page.getByRole('button', { name: /Filtros/ }).click();
	await page.getByRole('combobox', { name: 'Período' }).click();
	await page.getByRole('option', { name: 'Personalizado' }).click();
	await page.getByRole('button', { name: 'Data inicial' }).click();
	const grid = page.getByRole('grid');
	await grid.waitFor();
	await grid.getByRole('button', { name: /17 de novembro de 2026/i }).click();
	await page.getByRole('button', { name: 'Data final' }).click();
	await page.screenshot({ path: 'testsprite_tests/tmp/date-filter-mobile.png', animations: 'disabled' });
	await page
		.getByRole('grid')
		.getByRole('button', { name: /20 de novembro de 2026/i })
		.click();
	await page.getByRole('button', { name: 'Aplicar filtros' }).click();
	await page.getByRole('dialog').waitFor({ state: 'hidden' });
	checks.push('Finance dates chosen through Shadcn calendar inside sheet');
	await page.goto(base + '/admin/analises');
	await page.getByRole('button', { name: /Filtros/ }).click();
	await page.getByRole('button', { name: 'Data inicial' }).click();
	await page.getByRole('grid').waitFor();
	check(
		(await page.locator('input[type=date],input[type=datetime-local]').count()) === 0,
		'Native date control remains',
	);
	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
	checks.push('Analytics filter uses the same calendar');
	await page.goto(base + '/super-admin/conteudo/blog/novo');
	await page.getByRole('button', { name: 'Data de publicação' }).click();
	await page.getByRole('grid').waitFor();
	await page
		.getByRole('grid')
		.getByRole('button', { name: /20 de novembro de 2026/i })
		.click();
	await page.getByLabel('Horário', { exact: true }).fill('15:30');
	await page.getByRole('button', { name: 'Concluir' }).click();
	check(
		(await page.getByRole('button', { name: 'Data de publicação' }).innerText()).includes('15:30'),
		'Time selection lost',
	);
	await page.getByRole('button', { name: 'Data de publicação' }).click();
	await page.getByRole('button', { name: 'Limpar data' }).click();
	check(
		(await page.getByRole('button', { name: 'Data de publicação' }).innerText()).includes('Selecione'),
		'Optional publication date did not clear',
	);
	checks.push('CMS calendar preserves time and supports immediate publication');
	return { checks };
};
