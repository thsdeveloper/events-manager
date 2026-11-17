import type { Globals, MediaFile } from '@events-manager/contracts';
import type { Metadata, MetadataRoute } from 'next';
import { getMediaAssetUrl } from './media';

function iconDescriptor(asset: MediaFile | string | null | undefined) {
	const url = getMediaAssetUrl(asset) || '/favicon.ico';
	const file = typeof asset === 'object' ? asset : null;
	const type = file?.type ?? (url.endsWith('.svg') ? 'image/svg+xml' : url.endsWith('.png') ? 'image/png' : undefined);
	const width = file?.metadata?.width;
	const height = file?.metadata?.height;
	const sizes =
		type === 'image/svg+xml'
			? 'any'
			: type === 'image/png' && typeof width === 'number' && typeof height === 'number'
				? `${width}x${height}`
				: undefined;

	return { url, ...(type ? { type } : {}), ...(sizes ? { sizes } : {}) };
}
export function getBrandingIcons(globals: Globals): Metadata['icons'] {
	return {
		icon: [
			iconDescriptor(globals.favicon),
			...(globals.favicon_dark_mode
				? [{ ...iconDescriptor(globals.favicon_dark_mode), media: '(prefers-color-scheme: dark)' }]
				: []),
		],
		...(globals.app_icon
			? { apple: [{ ...iconDescriptor(globals.app_icon), type: 'image/png', sizes: '1024x1024' }] }
			: {}),
	};
}
export function getBrandingManifest(globals: Globals): MetadataRoute.Manifest {
	const icon = iconDescriptor(globals.app_icon ?? globals.favicon);

	return {
		id: '/',
		name: globals.title || 'Events Manager',
		short_name: globals.title || 'Events Manager',
		description: globals.description || 'Plataforma de gestão de eventos.',
		lang: 'pt-BR',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: getBrandAccentColor(globals.accent_color),
		icons: [
			{
				src: icon.url,
				...(icon.type ? { type: icon.type } : {}),
				...(icon.sizes ? { sizes: icon.sizes } : {}),
				purpose: 'any',
			},
		],
	};
}

export function getBrandLogoSources(globals?: Pick<Globals, 'logo' | 'logo_dark_mode'> | null) {
	const light = getMediaAssetUrl(globals?.logo) || '/images/logo.svg';
	const dark = getMediaAssetUrl(globals?.logo_dark_mode) || (globals?.logo ? light : '/images/logo-dark.svg');

	return { light, dark };
}
export function getBrandAccentColor(color?: string | null) {
	return !color || color.toLowerCase() === '#6644ff' ? '#743df5' : color;
}
