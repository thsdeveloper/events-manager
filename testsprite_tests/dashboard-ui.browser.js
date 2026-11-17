async (page) => {
	const base = 'http://localhost:3004';
	const results = [];
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const check = (condition, message) => {
		if (!condition) throw new Error(message);
	};
	for (const theme of ['light', 'dark']) {
		await page.evaluate((mode) => localStorage.setItem('theme', mode), theme);
		for (const width of [1440, 768, 390, 320]) {
			await page.setViewportSize({ width, height: 1000 });
			await page.goto(base + '/chart-visual-check');
			await page.waitForFunction((mode) => document.documentElement.classList.contains(mode), theme);
			await page.getByRole('img', { name: 'Volume por organizador' }).waitFor();
			await page.getByRole('img', { name: 'Vendas ao longo do tempo' }).waitFor();
			const images = page.locator('svg[aria-roledescription="chart"]');
			check((await images.count()) === 5, 'Expected all five chart types');
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
			check(!overflow, `Chart overflow at ${theme}/${width}`);
			const ranking = page.getByRole('region', { name: 'Volume por organizador' });
			await ranking.getByRole('img').focus();
			await page.keyboard.press('Home');
			const first = await ranking.getByRole('status').innerText();
			check(!first.includes('undefined'), 'Invalid chart tooltip');
			await page.keyboard.press('End');
			check((await ranking.getByRole('status').innerText()) !== first, 'Chart keyboard navigation did not move');
			await ranking.getByRole('button', { name: 'Ver dados em tabela' }).click();
			check((await ranking.getByRole('table').innerText()).includes('15.000,00'), 'Exact currency missing from table');
			await ranking.getByRole('button', { name: 'Ocultar tabela' }).click();
			await page.getByRole('tab', { name: 'Ingressos', exact: true }).click();
			check(
				(await page.getByRole('tab', { name: 'Ingressos', exact: true }).getAttribute('aria-selected')) === 'true',
				'Metric tab failed',
			);
			const donut = page.getByRole('region', { name: 'Status dos pagamentos' });
			await donut.getByRole('img').focus();
			await page.keyboard.press('Home');
			check(
				!(await donut.getByRole('status').innerText()).includes('undefined'),
				'Donut tooltip lost its status label',
			);
			await page.keyboard.press('Tab');
			if (width === 1440 || width === 390)
				await page.screenshot({ path: `testsprite_tests/tmp/charts-${theme}-${width}.png`, fullPage: true });
			results.push({ theme, width, charts: 5, overflow: false, keyboard: true, table: true, tabs: true });
		}
	}
	return { results, errors };
};
