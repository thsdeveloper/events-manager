import type { MediaFile } from '@events-manager/contracts';
export function imageUrl(file: MediaFile | string | null | undefined, api: string): string | undefined {
	if (!file) return undefined;
	if (typeof file === 'string') {
		if (/^https?:\/\//i.test(file)) return file;
		if (!/^[a-zA-Z0-9-]+$/.test(file)) return undefined;
	}
	return `${api}/api/media/${encodeURIComponent(typeof file === 'string' ? file : file.id)}`;
}
export function plainText(html: string | null | undefined): string {
	return (html ?? '')
		.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<br\s*\/?\s*>|<\/p>|<\/li>|<\/h[1-6]>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
