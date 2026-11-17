// Playwright CLI run-code. Requires an isolated local UI fixture created for this test.
// Uses the production preview on localhost:3004. Never run the upload scenario on a real organization.
async (page) => {
	const response = await page.request.get('http://localhost:3004/api/auth/me');
	const auth = await response.json();
	if (!auth.user?.email?.match(/^admin-ui-.*@example\.test$/)) throw new Error('Use an isolated admin-ui fixture');
	const workspace = async (page) => {
		const assert = (condition, message) => {
			if (!condition) throw new Error(message);
		};
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('http://localhost:3004/admin/analises');
		await page.getByRole('heading', { name: 'Análises', exact: true }).waitFor();
		const content = await page.getByRole('heading', { name: 'Análises', exact: true }).evaluate((el) => {
			const root = el.closest('header').parentElement;
			return { width: root.getBoundingClientRect().width, parent: root.parentElement.getBoundingClientRect().width };
		});
		assert(Math.abs(content.width - content.parent) < 1, 'Analytics is not filling its container');
		const sidebar = page.locator('[data-sidebar="sidebar"]');
		if ((await sidebar.boundingBox()).width < 70) {
			await page.getByRole('button', { name: 'Alternar navegação', exact: true }).click();
			await page.waitForFunction(
				() => document.querySelector('[data-sidebar="sidebar"]').getBoundingClientRect().width > 200,
			);
		}
		await page.getByText('Vendas ao Longo do Tempo', { exact: true }).waitFor();
		const expanded = (await sidebar.boundingBox()).width;
		await page.getByRole('button', { name: 'Alternar navegação', exact: true }).click();
		await page.waitForFunction(
			() => document.querySelector('[data-sidebar="sidebar"]').getBoundingClientRect().width < 70,
		);
		const collapsed = (await sidebar.boundingBox()).width;
		assert(collapsed >= 32 && collapsed < expanded, 'Sidebar must preserve a visible icon rail');
		const events = page.getByRole('link', { name: 'Eventos', exact: true });
		await events.hover();
		await page.getByRole('tooltip', { name: 'Eventos', exact: true }).waitFor();
		const animation = await events.locator('svg').evaluate((el) => getComputedStyle(el).animationName);
		assert(animation !== 'none', 'Hover animation missing');
		await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/sidebar-collapsed.png' });
		await page.reload();
		await page.getByRole('heading', { name: 'Análises', exact: true }).waitFor();
		assert((await sidebar.boundingBox()).width < 70, 'Collapsed preference not restored');
		await page.getByRole('button', { name: 'Alternar navegação', exact: true }).click();
		await page.waitForFunction(
			() => document.querySelector('[data-sidebar="sidebar"]').getBoundingClientRect().width > 200,
		);
		await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/analytics-desktop.png' });
		await page.setViewportSize({ width: 390, height: 844 });
		await page.getByRole('button', { name: 'Alternar navegação', exact: true }).click();
		await page.getByRole('dialog', { name: 'Navegação', exact: true }).waitFor();
		await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/sidebar-mobile.png' });
		await page
			.getByRole('dialog', { name: 'Navegação', exact: true })
			.getByRole('link', { name: 'Configurações', exact: true })
			.click();
		await page.getByRole('heading', { name: 'Perfil e repasses', exact: true }).waitFor();
		assert(
			(await page.getByRole('dialog', { name: 'Navegação', exact: true }).count()) === 0,
			'Mobile navigation did not close',
		);
		await page.setViewportSize({ width: 1440, height: 1000 });
		assert(errors.length === 0, JSON.stringify(errors));
		return { content, expanded, collapsed, animation, mobile: true, errors };
	};
	const upload = async (page) => {
		const assert = (condition, message) => {
			if (!condition) throw new Error(message);
		};
		await page.goto('http://localhost:3004/admin/configuracoes');
		await page.getByRole('heading', { name: 'Perfil e repasses', exact: true }).waitFor();
		const picture = await page.evaluate(() => {
			const canvas = document.createElement('canvas');
			canvas.width = 960;
			canvas.height = 480;
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = '#2563eb';
			ctx.fillRect(0, 0, 960, 480);
			ctx.fillStyle = '#f97316';
			ctx.fillRect(240, 0, 480, 480);
			return canvas.toDataURL('image/png').split(',')[1];
		});
		const upload = async () => {
			await page
				.getByLabel('Imagem da organização', { exact: true })
				.setInputFiles({
					name: 'avatar-retangular.png',
					mimeType: 'image/png',
					buffer: Buffer.from(picture, 'base64'),
				});
			const dialog = page.getByRole('dialog', { name: 'Ajustar logo', exact: true });
			await dialog.waitFor();
			await page.getByRole('button', { name: 'Salvar logo', exact: true }).waitFor();
			await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/square-crop.png' });
			const responsePromise = page.waitForResponse(
				(response) => response.url().endsWith('/api/organizer/logo') && response.request().method() === 'POST',
			);
			await page.getByRole('button', { name: 'Salvar logo', exact: true }).click();
			const response = await responsePromise;
			assert(response.ok(), 'Logo upload failed: ' + response.status());
			const body = await response.json();
			assert(body.cleanupPending === false, 'Previous image cleanup failed');
			await page.waitForFunction(() => {
				const img = document.querySelector('img[alt="Logo da organização"]');
				return img?.complete && img.naturalWidth > 0 && !img.src.startsWith('blob:');
			});
			const dimensions = await page
				.getByRole('img', { name: 'Logo da organização', exact: true })
				.evaluate((img) => ({ width: img.naturalWidth, height: img.naturalHeight, src: img.getAttribute('src') }));
			assert(
				dimensions.width === 512 && dimensions.height === 512,
				'Uploaded avatar is not square: ' + JSON.stringify(dimensions),
			);
			return { id: body.file.file.id, url: body.file.url, dimensions };
		};
		const first = await upload();
		const second = await upload();
		const oldRecord = await page.request.get('http://localhost:3004/api/media/' + first.id);
		const oldObject = await page.request.get(first.url);
		assert(oldRecord.status() === 404, 'Old media record remains');
		assert(!oldObject.ok(), 'Old storage object remains');
		await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/avatar-saved.png' });
		const removePromise = page.waitForResponse(
			(response) => response.url().endsWith('/api/organizer/logo') && response.request().method() === 'DELETE',
		);
		await page.getByRole('button', { name: 'Remover', exact: true }).click();
		const removed = await removePromise;
		assert(removed.ok(), 'Remove logo failed');
		await page.getByRole('img', { name: 'Logo da organização', exact: true }).waitFor({ state: 'detached' });
		const secondObject = await page.request.get(second.url);
		assert(!secondObject.ok(), 'Removed logo object remains');
		return {
			first: first.dimensions,
			second: second.dimensions,
			replacementDeletedOldRecord: oldRecord.status(),
			replacementDeletedOldObject: oldObject.status(),
			removalDeletedObject: secondObject.status(),
		};
	};
	const extra = async (page) => {
		const assert = (condition, message) => {
			if (!condition) throw new Error(message);
		};
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto('http://localhost:3004/super-admin');
		await page.getByRole('heading', { name: 'Saúde do ecossistema', exact: true }).waitFor();
		await page.getByRole('button', { name: 'Alternar navegação', exact: true }).click();
		const pages = page.getByRole('link', { name: 'Páginas', exact: true });
		await pages.hover();
		await page.getByRole('tooltip', { name: 'Páginas', exact: true }).waitFor();
		await pages.click();
		await page.getByRole('heading', { name: 'Páginas', exact: true }).waitFor();
		await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/super-admin.png' });
		await page.goto('http://localhost:3004/admin/eventos/novo');
		await page.getByRole('textbox', { name: /Nome do evento/ }).waitFor();
		await page.screenshot({ path: 'testsprite_tests/tmp/admin-improvements/event-wizard.png' });
		await page.getByRole('heading', { name: 'Novo evento', level: 1 }).waitFor();
		const font = await page
			.getByRole('textbox', { name: /Nome do evento/ })
			.evaluate((el) => getComputedStyle(el).fontFamily);
		const preloadedFont = await page.locator('link[rel="preload"][as="font"]').count();
		assert(preloadedFont > 0, 'Next font is not preloaded');
		assert(errors.length === 0, JSON.stringify(errors));
		return { superAdminTooltip: true, wizardLoaded: true, font, preloadedFont, errors };
	};
	const result = { workspace: await workspace(page), upload: await upload(page), extra: await extra(page) };
	await page.goto('http://localhost:3004/admin/analises');
	await page.getByText('Vendas ao Longo do Tempo', { exact: true }).waitFor();
	const checkins = page.getByText('Mapa de Calor - Check-ins por Horário', { exact: true });
	if (await checkins.count()) throw new Error('Below-fold chart loaded before approaching the viewport');
	await page.getByRole('status', { name: 'Carregando gráfico' }).last().scrollIntoViewIfNeeded();
	await checkins.waitFor();
	result.deferredChart = true;
	return result;
};
