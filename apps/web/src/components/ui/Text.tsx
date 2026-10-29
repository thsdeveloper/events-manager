import { sanitizeHtml } from '@events-manager/contracts';
import { cn } from '@/lib/utils';

export interface TextProps {
	content: string;
	className?: string;
}

const HTML_ENTITIES: Record<string, string> = {
	amp: '&',
	apos: "'",
	gt: '>',
	lt: '<',
	nbsp: ' ',
	quot: '"',
};

function decodeCodePoint(value: string, radix: number) {
	const codePoint = Number.parseInt(value, radix);

	return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '�';
}

export function htmlToPlainText(content: string) {
	return content
		.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<br\s*\/?>|<\/(?:blockquote|div|h[1-6]|li|p|pre)>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&#x([0-9a-f]+);/gi, (_, value: string) => decodeCodePoint(value, 16))
		.replace(/&#(\d+);/g, (_, value: string) => decodeCodePoint(value, 10))
		.replace(/&([a-z]+);/gi, (entity, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? entity)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Renderiza o HTML rico do CMS. A API já sanitiza na gravação e na leitura;
 * esta é a segunda camada, para que nenhum caminho (cache antigo, seed manual,
 * bug do editor) consiga colocar script na página.
 */
const HAS_HTML_TAG = /<\/?[a-z][^>]*>/i;

function escapeHtml(value: string) {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Texto simples, escrito antes do editor de texto rico: linhas em branco viram
 * parágrafos e quebras simples viram `<br>`, para que o espaçamento que a
 * pessoa digitou apareça na página em vez de virar um bloco corrido.
 */
export function plainTextToHtml(value: string) {
	return value
		.replace(/\r\n?/g, '\n')
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

const Text = ({ content, className }: TextProps) => {
	const html = HAS_HTML_TAG.test(content) ? content : plainTextToHtml(content);

	return (
		<div
			className={cn('prose prose-slate max-w-none dark:prose-invert', className)}
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
		/>
	);
};

export default Text;
