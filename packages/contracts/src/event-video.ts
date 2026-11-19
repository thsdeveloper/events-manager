import { z } from 'zod';

/** Parse public presentation videos without accepting arbitrary embed URLs. */
export function getYouTubeVideoId(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
		let id: string | null = null;
		if (url.hostname === 'youtu.be') {
			id = url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1] ?? null;
		} else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
			id =
				url.pathname === '/watch'
					? url.searchParams.get('v')
					: (url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1] ?? null);
		} else if (url.hostname === 'www.youtube-nocookie.com') {
			id = url.pathname.match(/^\/embed\/([\w-]{11})\/?$/)?.[1] ?? null;
		}
		return id && /^[\w-]{11}$/.test(id) ? id : null;
	} catch {
		return null;
	}
}

export const eventVideoUrlSchema = z
	.string()
	.trim()
	.max(2048, 'Use um link com até 2048 caracteres.')
	.refine((value) => !value || getYouTubeVideoId(value) !== null, 'Informe um link válido de vídeo do YouTube.');
