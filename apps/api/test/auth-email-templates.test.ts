/**
 * Os e-mails de autenticação são renderizados pelo Supabase a partir de
 * `supabase/templates`. Este teste garante que cada fluxo tenha um template
 * próprio, em português e com a mesma identidade visual, em vez de cair no
 * padrão em inglês e sem marca do provedor.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const config = readFileSync(join(repositoryRoot, 'supabase/config.toml'), 'utf8');

function templateSection(name: string) {
	const match = config.match(new RegExp(`\\[auth\\.email\\.template\\.${name}\\]\\n([\\s\\S]*?)(?:\\n\\[|$)`));
	if (!match) return null;
	const subject = match[1].match(/subject = "(.*)"/)?.[1] ?? null;
	const contentPath = match[1].match(/content_path = "(.*)"/)?.[1] ?? null;
	return { subject, contentPath };
}

function templateHtml(contentPath: string) {
	return readFileSync(join(repositoryRoot, contentPath), 'utf8');
}

/** Marcas que todo e-mail de autenticação carrega, para que pareçam vir do mesmo lugar. */
const brandMarkers = ['lang="pt-BR"', '{{ .SiteURL }}/api/branding/logo', '#6644ff', 'Acessar o site'];

describe('Supabase auth e-mail templates', () => {
	it.each(['confirmation', 'recovery'])('configures a branded %s template in Portuguese', (name) => {
		const section = templateSection(name);

		expect(section, `[auth.email.template.${name}] ausente em config.toml`).not.toBeNull();
		expect(section?.subject).toMatch(/[a-záéíóúçã]/i);
		expect(section?.subject).not.toMatch(/reset|password|confirm your/i);
		expect(section?.contentPath && existsSync(join(repositoryRoot, section.contentPath))).toBe(true);

		const html = templateHtml(section!.contentPath!);
		for (const marker of brandMarkers) expect(html).toContain(marker);
	});

	it('sends the recovery e-mail as a link, valid for the OTP window, with an ignore notice', () => {
		const section = templateSection('recovery');
		const html = templateHtml(section!.contentPath!);

		expect(html).toContain('{{ .ConfirmationURL }}');
		expect(html).not.toContain('{{ .Token }}');
		expect(html).toMatch(/15 minutos/);
		expect(html).toMatch(/ignore/i);
		expect(html).toMatch(/redefinir|nova senha/i);
	});

	it('keeps the confirmation e-mail on the one-time code flow', () => {
		const section = templateSection('confirmation');
		const html = templateHtml(section!.contentPath!);

		expect(html).toContain('{{ .Token }}');
		expect(html).toContain('{{ .SiteURL }}/confirmar-email');
	});
});
