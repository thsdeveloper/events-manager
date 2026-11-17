// Run with playwright-cli run-code in an authenticated, disposable LOCAL fixture.
// AI responses are intercepted: this check never consumes OpenAI credits.
async (page) => {
	const origin = 'http://localhost:3004';
	const api = (path) => new URL(path, origin).href;
	const identity = await (await page.request.get(api('/api/auth/me'))).json();
	if (!identity.user?.email?.startsWith('admin-ui-') || !identity.user.email.endsWith('@example.test')) {
		throw new Error('Use a disposable local admin UI fixture.');
	}
	await page.goto(origin + '/admin/eventos/novo');
	await page.evaluate(() => localStorage.removeItem('event-creation-wizard'));
	await page.reload();
	let eventPosts = 0;
	let coverContext;
	let descriptionContext;
	const title = 'Validação do cadastro de eventos ' + Date.now();
	const original =
		'Conheça novas ideias em oficinas práticas de tecnologia e compartilhe experiências com profissionais da comunidade.';
	const suggested =
		'Participe de oficinas práticas de tecnologia e compartilhe experiências com profissionais da comunidade. Um encontro para aprender, trocar ideias e ampliar suas conexões.';
	page.on('request', (request) => {
		if (new URL(request.url()).pathname === '/api/events' && request.method() === 'POST') eventPosts++;
	});
	await page.route('**/api/ai/generate-description', async (route) => {
		descriptionContext = route.request().postDataJSON();
		await route.fulfill({ json: { description: suggested } });
	});
	await page.route('**/api/ai/generate-cover', async (route) => {
		coverContext = route.request().postDataJSON();
		await route.fulfill({ json: { fileId: '00000000-0000-4000-8000-000000000099' } });
	});
	await page.route('**/api/media/00000000-0000-4000-8000-000000000099', (route) =>
		route.fulfill({
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="864"><rect width="1536" height="864" fill="#ddd"/></svg>',
		}),
	);
	await page.getByRole('textbox', { name: 'Nome do evento*', exact: true }).fill(title);
	await page.getByRole('button', { name: 'Selecionar categoria Tecnologia', exact: true }).click();
	await page
		.getByRole('textbox', { name: 'Descrição curta', exact: true })
		.fill('Oficinas práticas e networking para profissionais de tecnologia.');
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
	await page.getByRole('textbox', { name: 'Descrição completa', exact: true }).fill(original);
	await page.getByRole('button', { name: 'Criar descrição com IA', exact: true }).click();
	await page.getByRole('textbox', { name: /O que não pode faltar/ }).fill('Oficinas para iniciantes e networking');
	await page.getByRole('button', { name: 'Gerar sugestão', exact: true }).click();
	await page.getByRole('textbox', { name: 'Sugestão de descrição', exact: true }).waitFor();
	if (
		(await page
			.getByRole('textbox', { name: 'Descrição completa', exact: true, includeHidden: true })
			.textContent()) !== original
	)
		throw new Error('AI overwrote the description before approval');
	await page.screenshot({ path: 'testsprite_tests/tmp/wizard-description-production.png', fullPage: true });
	await page.getByRole('button', { name: 'Usar esta descrição', exact: true }).click();
	await page.getByRole('textbox', { name: 'Nova tag', exact: true }).fill('inovação');
	await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
	await page.getByRole('heading', { name: 'Quando será o evento?', exact: true }).waitFor();
	if (await page.getByRole('button', { name: /Período de inscrições/ }).count())
		throw new Error('Duplicate sales period in Agenda');
	const target = new Date();
	target.setDate(15);
	target.setMonth(target.getMonth() + 1);
	const dayLabel = target.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
	async function chooseDate(button, time) {
		await button.click();
		const calendar = page
			.getByRole('dialog')
			.filter({ has: page.getByLabel('Horário', { exact: true }) })
			.last();
		const day = calendar.getByRole('button', { name: new RegExp(dayLabel) });
		for (let attempt = 0; attempt < 2 && !(await day.count()); attempt++) {
			await calendar.getByRole('button', { name: 'Go to the Next Month', exact: true }).click();
		}
		await day.click();
		await calendar.getByLabel('Horário', { exact: true }).fill(time);
		await calendar.getByRole('button', { name: 'Concluir', exact: true }).click();
		await calendar.waitFor({ state: 'hidden' });
	}
	await chooseDate(page.getByRole('button', { name: 'Início do evento', exact: true }), '18:00');
	await chooseDate(page.getByRole('button', { name: 'Término do evento', exact: true }), '22:00');
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
	await page.getByRole('button', { name: 'Online', exact: true }).click();
	await page.getByRole('combobox', { name: 'Plataforma', exact: true }).click();
	await page.getByRole('option', { name: 'Google Meet', exact: true }).click();
	await page.getByRole('textbox', { name: 'Link de acesso', exact: true }).fill('https://meet.google.com/abc-defg-hij');
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
	await page.getByRole('button', { name: /Evento pago/ }).click();
	await page
		.getByRole('button', { name: /Adicionar ingresso/ })
		.first()
		.click();
	const sheet = page.getByRole('dialog');
	await sheet.getByRole('textbox', { name: /Nome do ingresso/ }).fill('Lote inicial');
	await sheet.getByRole('spinbutton', { name: /Valor do ingresso/ }).fill('50');
	await sheet.getByRole('spinbutton', { name: /Quantidade disponível/ }).fill('30');
	await sheet.getByRole('combobox', { name: 'Categoria do ingresso' }).click();
	await page.getByRole('option', { name: 'Meia-entrada', exact: true }).click();
	await chooseDate(sheet.getByRole('button', { name: 'Início', exact: true }), '09:00');
	await chooseDate(sheet.getByRole('button', { name: 'Fim', exact: true }), '17:00');
	await sheet.getByRole('button', { name: 'Adicionar ingresso', exact: true }).click();
	await page.getByRole('radio', { name: /Rascunho/ }).click();
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
	await page.getByRole('button', { name: 'Gerar imagem com IA', exact: true }).click();
	await page.getByRole('button', { name: 'Remover imagem', exact: true }).waitFor();
	if (
		!coverContext?.tags?.includes('inovação') ||
		coverContext.description !== suggested ||
		coverContext.event_type !== 'online'
	)
		throw new Error('Incomplete cover context');
	// The simulated image has no real storage record; remove it before the real event POST.
	await page.getByRole('button', { name: 'Remover imagem', exact: true }).click();
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
	await page.getByRole('heading', { name: 'Confira antes de finalizar', exact: true }).waitFor();
	if (eventPosts) throw new Error('Event saved before confirmation');
	await page.getByRole('button', { name: 'Editar descrição', exact: true }).click();
	await page.getByRole('textbox', { name: 'Descrição completa', exact: true }).waitFor();
	await page.getByRole('button', { name: /^Revisão:/ }).click();
	await page.getByRole('heading', { name: 'Confira antes de finalizar', exact: true }).waitFor();
	await page
		.locator('form')
		.first()
		.evaluate((form) => form.requestSubmit());
	if (eventPosts) throw new Error('Implicit form submission saved the event');
	await page.screenshot({ path: 'testsprite_tests/tmp/wizard-review-production.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: 'testsprite_tests/tmp/wizard-review-production-mobile.png', fullPage: true });
	if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
		throw new Error('Horizontal overflow');
	await page.setViewportSize({ width: 1440, height: 1000 });
	const created = page.waitForResponse(
		(response) => new URL(response.url()).pathname === '/api/events' && response.request().method() === 'POST',
	);
	await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
	const response = await created;
	const event = await response.json();
	if (!response.ok()) throw new Error(JSON.stringify(event));
	try {
		await page.waitForURL('**/admin/eventos/' + event.id);
		if (eventPosts !== 1) throw new Error('Duplicate event submission');
		const saved = await (await page.request.get(api('/api/events/' + event.id))).json();
		if (
			saved.title !== title ||
			saved.tickets?.length !== 1 ||
			!saved.tickets[0].sale_start_date ||
			saved.registration_start
		)
			throw new Error('Incorrect persisted event');
		return {
			eventPosts,
			status: saved.status,
			ticketCount: saved.tickets.length,
			titleAndCategoryInDescription: descriptionContext.title === title && Boolean(descriptionContext.categoryId),
			completeCoverContext: true,
			onlyTicketSalesPeriod: true,
			explicitConfirmation: true,
			mobileOverflow: false,
		};
	} finally {
		const removed = await page.request.delete(api('/api/events/' + event.id));
		if (!removed.ok()) throw new Error('Could not remove the fixture event');
	}
};
