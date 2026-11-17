// Run with playwright-cli against the isolated production build (fixture route included there only).
async (page) => {
	const origin = 'http://localhost:3004';
	const paths = [
		'/',
		'/sobre',
		'/contato',
		'/politicas-de-uso',
		'/blog',
		'/blog/bem-vindo-ao-blog',
		'/cms-layout-check',
		'/eventos',
		'/taxas',
	];
	const results = [];
	const failures = [];
	for (const width of [1440, 768, 390])
		for (const theme of ['light', 'dark']) {
			await page.setViewportSize({ width, height: 1000 });
			await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
			await page.goto(origin);
			await page.getByRole('radio', { name: theme === 'light' ? 'Claro' : 'Escuro', exact: true }).click();
			for (const path of paths) {
				const response = await page.goto(origin + path);
				if (response.status() !== 200) throw new Error(path + ' returned ' + response.status());
				await page.evaluate(() => document.fonts.ready);
				const result = await page.evaluate(() => {
					const problems = [];
					const header = document.querySelector('body header > div');
					const footer = document.querySelector('footer > div');
					const edges = (el) => {
						const r = el.getBoundingClientRect(),
							s = getComputedStyle(el);
						return [r.left + parseFloat(s.paddingLeft), r.right - parseFloat(s.paddingRight)];
					};
					const expected = edges(header);
					for (const element of [footer, ...document.querySelectorAll('[data-cms-page] > section > div')])
						if (edges(element).some((value, index) => Math.abs(value - expected[index]) > 1))
							problems.push('Container misaligned: ' + element.parentElement.getAttribute('aria-label'));
					if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('Horizontal overflow');
					const rgb = (color) => color.match(/[\d.]+/g)?.map(Number) || [];
					const luminance = (color) =>
						rgb(color)
							.slice(0, 3)
							.map((c) => c / 255)
							.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
							.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
					let checked = 0;
					for (const el of document.querySelectorAll(
						'main h1, main h2, main h3, main h4, main p, main label, main li, main td, main th, main blockquote',
					)) {
						if (!el.textContent.trim() || !el.getClientRects().length) continue;
						const style = getComputedStyle(el);
						let parent = el,
							background = null,
							skip = false;
						while (parent) {
							const s = getComputedStyle(parent);
							if (Number(s.opacity) < 0.99 || s.backgroundImage !== 'none') {
								skip = true;
								break;
							}
							const channels = rgb(s.backgroundColor);
							if (!background && channels.length >= 3 && (channels.length === 3 || channels[3] === 1))
								background = s.backgroundColor;
							parent = parent.parentElement;
						}
						if (skip || !background) continue;
						const fg = luminance(style.color),
							bg = luminance(background),
							contrast = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
						const large =
							parseFloat(style.fontSize) >= 24 ||
							(parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
						if (contrast < (large ? 3 : 4.5) - 0.05)
							problems.push('Low contrast ' + contrast.toFixed(2) + ': ' + el.textContent.trim().slice(0, 65));
						if (/^H[1-4]$/.test(el.tagName) && Number(style.fontWeight) !== 600)
							problems.push('Heading must use semibold: ' + el.textContent);
						if (/^H[1-4]$/.test(el.tagName) && parseFloat(style.fontSize) > 36)
							problems.push('Heading exceeds 36px: ' + el.textContent);
						if (!style.fontFamily.toLowerCase().includes('dm'))
							problems.push('DM Sans missing: ' + el.textContent.slice(0, 30));
						checked++;
					}
					return {
						problems,
						checked,
						sections: document.querySelectorAll('[data-cms-page] > section').length,
						edges: expected,
					};
				});
				results.push({ path, width, theme, ...result });
				failures.push(...result.problems.map((problem) => ({ path, width, theme, problem })));
				if (
					['/politicas-de-uso', '/sobre', '/contato', '/blog', '/eventos'].includes(path) &&
					(width === 1440 || width === 390)
				)
					await page.screenshot({
						path: `testsprite_tests/tmp/flouvi-${path.split('/').at(-1)}-${theme}-${width}.png`,
						fullPage: true,
						animations: 'disabled',
					});
			}
		}
	return { cases: results.length, results, failures };
};
