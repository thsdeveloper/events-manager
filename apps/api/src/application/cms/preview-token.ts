import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de pré-visualização de rascunhos, no espírito do "live preview" do
 * Directus: o painel gera um link assinado que abre a página pública mesmo
 * antes de publicá-la. O token é atrelado ao permalink e expira em uma hora,
 * então compartilhar o link não abre outros rascunhos nem vale para sempre.
 */
export const PREVIEW_TOKEN_TTL_MS = 60 * 60 * 1000;

function sign(secret: string, permalink: string, expiresAt: number) {
	return createHmac('sha256', secret).update(`${permalink}\n${expiresAt}`).digest('base64url');
}

export function createPreviewToken(secret: string, permalink: string, now = new Date()) {
	const expiresAt = now.getTime() + PREVIEW_TOKEN_TTL_MS;
	const token = `${expiresAt}.${sign(secret, permalink, expiresAt)}`;
	return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function verifyPreviewToken(secret: string, token: string, permalink: string, now = new Date()) {
	const [rawExpiry, signature] = token.split('.');
	const expiresAt = Number(rawExpiry);
	if (!Number.isInteger(expiresAt) || !signature) return false;
	if (now.getTime() > expiresAt) return false;
	const expected = Buffer.from(sign(secret, permalink, expiresAt));
	const received = Buffer.from(signature);
	return expected.length === received.length && timingSafeEqual(expected, received);
}
