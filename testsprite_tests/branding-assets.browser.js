// Authenticated local superadmin. Real uploads, isolated PATCH response; existing branding remains untouched.
async (page) => {
	const origin = 'http://localhost:3003';
	const assets = [
		['Logo (tema claro)', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/marca/svg/flouvi-horizontal-principal.svg'],
		['Logo (tema escuro)', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/marca/svg/flouvi-horizontal-inversa.svg'],
		['Favicon padrão', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/site/favicon.ico'],
		['Favicon escuro', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/site/favicon.svg'],
		['Ícone padrão', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/aplicativo/ios/Flouvi.appiconset/flouvi-1024.png'],
		['Ícone escuro', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/aplicativo/ios/Flouvi.appiconset/flouvi-escuro-1024.png'],
		['Ícone tonal', '/mnt/e/Ello4/Flouvi/Kit-Flouvi/aplicativo/ios/Flouvi.appiconset/flouvi-tonal-1024.png'],
	];
	const uploaded = [];
	let payload = null;
	const checks = [];
	await page.route('**/api/super-admin/settings/branding', (route) =>
		route.request().method() === 'PATCH'
			? ((payload = route.request().postDataJSON()), route.fulfill({ json: { success: true } }))
			: route.continue(),
	);
	try {
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto(origin + '/super-admin/identidade-visual');
		for (const [label, path] of assets) {
			const responsePromise = page.waitForResponse(
				(response) => response.url().includes('/settings/branding/assets?') && response.request().method() === 'POST',
			);
			await page.getByLabel(label, { exact: true }).setInputFiles(path);
			const response = await responsePromise;
			const body = await response.json();
			if (response.status() !== 201) throw new Error(label + ': ' + JSON.stringify(body));
			uploaded.push(body.fileId);
			await page.getByAltText('Prévia: ' + label, { exact: true }).scrollIntoViewIfNeeded();
			await page.getByAltText('Prévia: ' + label, { exact: true }).evaluate((image) => image.decode());
			if (await page.getByRole('dialog').count()) throw new Error('Unexpected crop dialog');
			checks.push({ label, type: body.file.type, dimensions: body.file.metadata });
		}
		const imageChecks = await page
			.locator('main img[alt^="Prévia:"]')
			.evaluateAll((images) => images.map((img) => ({ label: img.alt, loaded: img.complete && img.naturalWidth > 0 })));
		await page.evaluate(() => {
			document.activeElement?.blur();
			window.scrollTo(0, 0);
		});
		await page.screenshot({
			path: 'testsprite_tests/tmp/branding-desktop.png',
			fullPage: false,
			animations: 'disabled',
		});
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.activeElement?.blur();
			window.scrollTo(0, 0);
		});
		await page.screenshot({
			path: 'testsprite_tests/tmp/branding-mobile.png',
			fullPage: false,
			animations: 'disabled',
		});
		if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
			throw new Error('Branding page overflows on mobile');
		await page.getByRole('button', { name: 'Salvar identidade visual' }).click();
		await page
			.getByText('Identidade visual salva. Logos, favicons e ícones foram atualizados.', { exact: true })
			.waitFor();
		if (!payload || Object.values(payload).filter(Boolean).length !== 7)
			throw new Error('Missing identity fields in settings payload');
		return {
			uploads: checks,
			previews: imageChecks,
			save: 'PATCH intercepted; all seven fields submitted; current settings preserved',
		};
	} finally {
		for (const id of uploaded) {
			const response = await page.request.delete(origin + '/api/super-admin/cms/media/' + id);
			if (!response.ok()) throw new Error('Test asset cleanup failed: ' + response.status());
		}
		await page.unroute('**/api/super-admin/settings/branding');
	}
};
