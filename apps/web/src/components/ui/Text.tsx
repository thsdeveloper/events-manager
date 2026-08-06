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

const Text = ({ content, className }: TextProps) => {
	return <div className={cn('prose whitespace-pre-wrap dark:prose-invert', className)}>{htmlToPlainText(content)}</div>;
};

export default Text;
