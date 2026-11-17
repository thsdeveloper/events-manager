// Playwright CLI run-code: execute this function in a local authenticated admin session.
// Checks rendered appearance rather than Tailwind class names.
async (page) => {
	const baseUrl = /^http:\/\/localhost:\d+/.test(page.url()) ? new URL(page.url()).origin : 'http://localhost:3003';
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto(`${baseUrl}/admin/dashboard`);
	await page.evaluate(() => document.documentElement.classList.remove('dark'));
	const action = page.getByRole('link', { name: 'Criar evento', exact: true });
	await action.waitFor();
	const appearance = await action.evaluate((element) => {
		const style = getComputedStyle(element);
		return { background: style.backgroundColor, radius: style.borderRadius, weight: style.fontWeight };
	});
	if (appearance.background !== 'rgb(23, 23, 23)' || appearance.radius !== '6px' || appearance.weight !== '500') {
		throw new Error(`Expected the default neutral Shadcn button, received ${JSON.stringify(appearance)}`);
	}
	const outline = await page.getByRole('link', { name: 'Ver todos', exact: true }).evaluate((element) => {
		const style = getComputedStyle(element);
		return { background: style.backgroundColor, border: style.borderTopWidth, radius: style.borderRadius };
	});
	if (outline.background !== 'rgb(255, 255, 255)' || outline.border !== '1px' || outline.radius !== '6px') {
		throw new Error(`Expected the default outline variant, received ${JSON.stringify(outline)}`);
	}
	await page.evaluate(() => document.documentElement.classList.add('dark'));
	await page.waitForFunction(
		() =>
			getComputedStyle(document.querySelector('a[href="/admin/eventos/novo"]')).backgroundColor ===
			'rgb(250, 250, 250)',
	);
	const dark = await action.evaluate((element) => getComputedStyle(element).backgroundColor);
	if (dark !== 'rgb(250, 250, 250)') throw new Error(`Expected neutral dark mode, received ${dark}`);
	await page.evaluate(() => document.documentElement.classList.remove('dark'));
	await page.getByRole('button', { name: /Conta de/ }).click();
	const menu = page.getByRole('menu');
	await menu.waitFor();
	const portal = await menu.evaluate((element) => {
		const style = getComputedStyle(element);
		return { background: style.backgroundColor, radius: style.borderRadius };
	});
	if (portal.background !== 'rgb(255, 255, 255)' || portal.radius !== '6px') {
		throw new Error(`The account menu must inherit the admin theme: ${JSON.stringify(portal)}`);
	}
	await page.keyboard.press('Escape');
	return { light: appearance, outline, dark, portal };
};
