import type { EmailBranding } from './email-branding.js';

/**
 * One layout for every transactional e-mail: header with the logo, a body built
 * from typed blocks, and a footer with links and legal notes. Callers describe
 * *what* the message says; none of them write HTML.
 *
 * Built with tables and inline styles on purpose — Outlook and Gmail still drop
 * most modern CSS, and `<style>` blocks are stripped by several clients.
 */
export type EmailBlock =
	| { type: 'heading'; text: string }
	| { type: 'paragraph'; text: string }
	/** Big monospaced value, e.g. a confirmation code or a ticket code. */
	| { type: 'code'; value: string; label?: string }
	/** Label/value rows, e.g. event, date, venue. */
	| { type: 'details'; rows: Array<{ label: string; value: string }> }
	| { type: 'button'; label: string; url: string }
	| { type: 'divider' };

export interface EmailTemplateInput {
	branding: EmailBranding;
	blocks: EmailBlock[];
	/** Shown in the inbox preview line, after the subject. */
	preheader?: string;
	/** Small print above the footer links, e.g. "ignore se não foi você". */
	footerNote?: string;
	/** Extra links in the footer, beside the site link. */
	footerLinks?: Array<{ label: string; url: string }>;
}

export interface RenderedEmail {
	html: string;
	text: string;
}

export function escapeHtml(value: string) {
	return value.replace(
		/[&<>'"]/g,
		(character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!,
	);
}

/** Blocks an `href` that is not http(s), so a crafted value cannot inject `javascript:`. */
function safeUrl(value: string) {
	try {
		const url = new URL(value);

		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '#';
	} catch {
		return '#';
	}
}

function renderBlock(block: EmailBlock, branding: EmailBranding): string {
	switch (block.type) {
		case 'heading':
			return `<h1 style="margin:0 0 16px;color:#111827;font-size:24px;line-height:1.3;font-weight:700">${escapeHtml(block.text)}</h1>`;

		case 'paragraph':
			return `<p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6">${escapeHtml(block.text)}</p>`;

		case 'code':
			return `<div style="margin:0 0 20px;border-radius:12px;background:#f5f3ff;padding:20px;text-align:center">
				${block.label ? `<p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:1px;text-transform:uppercase">${escapeHtml(block.label)}</p>` : ''}
				<p style="margin:0;color:${escapeHtml(branding.accentColor)};font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px">${escapeHtml(block.value)}</p>
			</div>`;

		case 'details':
			return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-radius:12px;background:#f9fafb">
				${block.rows
					.map(
						(row) => `<tr>
					<td style="padding:10px 16px;color:#6b7280;font-size:13px;white-space:nowrap">${escapeHtml(row.label)}</td>
					<td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;text-align:right">${escapeHtml(row.value)}</td>
				</tr>`,
					)
					.join('')}
			</table>`;

		case 'button':
			return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px">
				<tr><td style="border-radius:10px;background:${escapeHtml(branding.accentColor)}">
					<a href="${escapeHtml(safeUrl(block.url))}" style="display:inline-block;padding:13px 24px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(block.label)}</a>
				</td></tr>
			</table>`;

		case 'divider':
			return '<div style="margin:0 0 20px;border-top:1px solid #e5e7eb"></div>';
	}
}

function blockToText(block: EmailBlock): string {
	switch (block.type) {
		case 'heading':
			return block.text.toUpperCase();
		case 'paragraph':
			return block.text;
		case 'code':
			return block.label ? `${block.label}: ${block.value}` : block.value;
		case 'details':
			return block.rows.map((row) => `${row.label}: ${row.value}`).join('\n');
		case 'button':
			return `${block.label}: ${block.url}`;
		case 'divider':
			return '---';
	}
}

export function renderEmail({
	branding,
	blocks,
	preheader,
	footerNote,
	footerLinks = [],
}: EmailTemplateInput): RenderedEmail {
	const siteUrl = safeUrl(branding.siteUrl);
	const links = [{ label: 'Acessar o site', url: siteUrl }, ...footerLinks];

	// A logo the client cannot fetch would leave a broken-image icon, so the site
	// name is rendered as text whenever there is no logo.
	const header = branding.logoUrl
		? `<img src="${escapeHtml(safeUrl(branding.logoUrl))}" alt="${escapeHtml(branding.siteName)}" height="36" style="display:block;max-height:36px;border:0;outline:none;text-decoration:none" />`
		: `<span style="color:${escapeHtml(branding.accentColor)};font-size:18px;font-weight:700">${escapeHtml(branding.siteName)}</span>`;

	const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(branding.siteName)}</title>
</head>
<body style="margin:0;background:#f4f3ff;color:#111827;font-family:Arial,Helvetica,sans-serif">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
<tr><td align="center">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;overflow:hidden;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff">
		<tr>
			<td style="border-bottom:1px solid #f3f4f6;padding:20px 32px">
				<a href="${escapeHtml(siteUrl)}" style="text-decoration:none">${header}</a>
			</td>
		</tr>
		<tr>
			<td style="padding:32px">
				${blocks.map((block) => renderBlock(block, branding)).join('\n')}
			</td>
		</tr>
		<tr>
			<td style="border-top:1px solid #e5e7eb;background:#fafafa;padding:20px 32px">
				${footerNote ? `<p style="margin:0 0 12px;color:#9ca3af;font-size:12px;line-height:1.5">${escapeHtml(footerNote)}</p>` : ''}
				<p style="margin:0 0 8px;font-size:12px">
					${links
						.map(
							(link) =>
								`<a href="${escapeHtml(safeUrl(link.url))}" style="margin-right:12px;color:${escapeHtml(branding.accentColor)};text-decoration:none">${escapeHtml(link.label)}</a>`,
						)
						.join('')}
				</p>
				<p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5">
					${escapeHtml(branding.siteName)}${branding.tagline ? ` — ${escapeHtml(branding.tagline)}` : ''}<br />
					${branding.supportEmail ? `Dúvidas? <a href="mailto:${escapeHtml(branding.supportEmail)}" style="color:#6b7280">${escapeHtml(branding.supportEmail)}</a><br />` : ''}
					Você recebeu este e-mail porque tem uma conta em ${escapeHtml(branding.siteName)}.
				</p>
			</td>
		</tr>
	</table>
</td></tr>
</table>
</body>
</html>`;

	const text = [
		branding.siteName,
		'',
		...blocks.map(blockToText),
		'',
		footerNote ?? '',
		links.map((link) => `${link.label}: ${link.url}`).join('\n'),
		branding.supportEmail ? `Dúvidas: ${branding.supportEmail}` : '',
	]
		.filter((line) => line !== '')
		.join('\n\n');

	return { html, text };
}
