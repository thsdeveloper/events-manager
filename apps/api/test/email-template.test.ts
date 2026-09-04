import { describe, expect, it } from 'vitest';
import { CachedEmailBranding } from '../src/application/email/email-branding.js';
import { renderEmail } from '../src/application/email/email-template.js';

const branding = {
	accentColor: '#6644ff',
	logoUrl: 'https://cdn.example.com/logo.png',
	siteName: 'Flouví',
	siteUrl: 'https://flouvi.example.com',
	supportEmail: 'suporte@flouvi.example.com',
	tagline: 'Eventos que conectam',
};

describe('renderEmail', () => {
	it('puts the configured logo in the header and links it to the site', () => {
		const { html } = renderEmail({ branding, blocks: [{ type: 'heading', text: 'Olá' }] });
		expect(html).toContain('src="https://cdn.example.com/logo.png"');
		expect(html).toContain('alt="Flouví"');
		expect(html).toContain('href="https://flouvi.example.com/"');
	});

	it('falls back to the site name when no logo is configured, avoiding a broken image', () => {
		const { html } = renderEmail({
			branding: { ...branding, logoUrl: null },
			blocks: [{ type: 'heading', text: 'Olá' }],
		});
		expect(html).not.toContain('<img');
		expect(html).toContain('Flouví');
	});

	it('escapes user-controlled text in every block type', () => {
		const { html } = renderEmail({
			branding,
			blocks: [
				{ type: 'heading', text: '<script>x</script>' },
				{ type: 'paragraph', text: 'Ana & <b>Silva</b>' },
				{ type: 'code', value: '<img>', label: '<i>' },
				{ type: 'details', rows: [{ label: '<a>', value: '"quote"' }] },
			],
		});
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('Ana &amp; &lt;b&gt;Silva&lt;/b&gt;');
		expect(html).toContain('&quot;quote&quot;');
	});

	it('neutralises a non-http button URL so a crafted link cannot run script', () => {
		const { html } = renderEmail({
			branding,
			blocks: [{ type: 'button', label: 'Abrir', url: 'javascript:alert(1)' }],
		});
		expect(html).not.toContain('javascript:');
		expect(html).toContain('href="#"');
	});

	it('always ships a plain-text alternative carrying the same content', () => {
		const { text } = renderEmail({
			branding,
			blocks: [
				{ type: 'paragraph', text: 'Sua inscrição está confirmada.' },
				{ type: 'code', value: 'EVT-123', label: 'Código' },
				{ type: 'button', label: 'Ver ingressos', url: 'https://flouvi.example.com/perfil' },
			],
		});
		expect(text).toContain('Sua inscrição está confirmada.');
		expect(text).toContain('Código: EVT-123');
		expect(text).toContain('https://flouvi.example.com/perfil');
	});

	it('renders the support address and tagline in the footer', () => {
		const { html } = renderEmail({ branding, blocks: [] });
		expect(html).toContain('mailto:suporte@flouvi.example.com');
		expect(html).toContain('Eventos que conectam');
	});
});

describe('CachedEmailBranding', () => {
	it('reads once and serves the cached value until the ttl expires', async () => {
		let calls = 0;
		let now = 0;
		const source = new CachedEmailBranding(
			async () => {
				calls += 1;

				return { siteName: 'Flouví' };
			},
			'https://flouvi.example.com',
			1000,
			() => now,
		);

		await source.load();
		await source.load();
		expect(calls).toBe(1);

		now = 1001;
		await source.load();
		expect(calls).toBe(2);
	});

	it('falls back to defaults when the branding row cannot be read', async () => {
		const source = new CachedEmailBranding(
			async () => {
				throw new Error('database down');
			},
			'https://flouvi.example.com',
		);

		const value = await source.load();
		expect(value.siteName).toBe('Events Manager');
		expect(value.siteUrl).toBe('https://flouvi.example.com');
	});
});
