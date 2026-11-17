import { describe, expect, it } from 'vitest';
import type { Globals, MediaFile } from '@events-manager/contracts';
import { getBrandingIcons, getBrandingManifest, getBrandLogoSources, getBrandAccentColor } from './branding';
const media = (id: string, type: string, width: number): MediaFile => ({
	id,
	path: `branding/${id}`,
	bucket: 'media',
	type,
	metadata: { width, height: width },
});
const globals: Globals = {
	id: 'site',
	title: 'Flouvi',
	description: 'Eventos que conectam',
	favicon: media('favicon.svg', 'image/svg+xml', 64),
	favicon_dark_mode: media('dark.svg', 'image/svg+xml', 64),
	app_icon: media('app.png', 'image/png', 1024),
	app_icon_dark_mode: media('dark.png', 'image/png', 1024),
	app_icon_tinted: media('tonal.png', 'image/png', 1024),
};
describe('public branding metadata', () => {
	it('publishes the standard and dark favicon with scalable SVG sizes and an Apple touch icon', () => {
		expect(getBrandingIcons(globals)).toMatchObject({
			icon: [
				{ url: expect.stringContaining('favicon.svg'), type: 'image/svg+xml', sizes: 'any' },
				{ url: expect.stringContaining('dark.svg'), media: '(prefers-color-scheme: dark)' },
			],
			apple: [{ url: expect.stringContaining('app.png'), sizes: '1024x1024', type: 'image/png' }],
		});
	});
	it('uses the standard app icon in the install manifest without selecting a native-only variant at random', () => {
		expect(getBrandingManifest(globals)).toMatchObject({
			name: 'Flouvi',
			description: 'Eventos que conectam',
			start_url: '/',
			display: 'standalone',
			icons: [{ src: expect.stringContaining('app.png'), sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
		});
		expect(getBrandingManifest(globals).icons).toHaveLength(1);
	});
	it('retains working defaults when branding is removed and supports legacy favicon URLs', () => {
		expect(getBrandingIcons({ id: 'site' })).toMatchObject({ icon: [{ url: '/favicon.ico' }] });
		expect(getBrandingIcons({ id: 'site', favicon: 'https://cdn.test/favicon.ico' })).toMatchObject({
			icon: [{ url: 'https://cdn.test/favicon.ico' }],
		});
		expect(getBrandingManifest({ id: 'site' }).name).toBe('Events Manager');
	});
	it('keeps a visible logo in each theme, using the brand kit when no custom logo is configured', () => {
		expect(getBrandLogoSources(null)).toEqual({ light: '/images/logo.svg', dark: '/images/logo-dark.svg' });
		expect(getBrandLogoSources({ logo: 'https://cdn.test/custom.svg' })).toEqual({
			light: 'https://cdn.test/custom.svg',
			dark: 'https://cdn.test/custom.svg',
		});
		expect(
			getBrandLogoSources({ logo: 'https://cdn.test/light.svg', logo_dark_mode: 'https://cdn.test/inverse.svg' }).dark,
		).toBe('https://cdn.test/inverse.svg');
	});
	it('uses the guide violet for the default brand and keeps an explicitly configured custom color', () => {
		expect(getBrandAccentColor()).toBe('#743df5');
		expect(getBrandAccentColor('#6644FF')).toBe('#743df5');
		expect(getBrandAccentColor('#112233')).toBe('#112233');
	});
});
