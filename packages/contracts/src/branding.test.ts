import { describe, expect, it } from 'vitest';
import { brandingAssetKeys, brandingAssetKind, brandingSettingsSchema } from './branding';
const id = '00000000-0000-4000-8000-000000000001';
describe('branding settings', () => {
	it('uses the same file requirements for each visual variant', () => {
		expect(['logo', 'logo_dark_mode'].map((key) => brandingAssetKind(key as 'logo'))).toEqual(['logo', 'logo']);
		expect(['favicon', 'favicon_dark_mode'].map((key) => brandingAssetKind(key as 'favicon'))).toEqual([
			'favicon',
			'favicon',
		]);
		expect(
			['app_icon', 'app_icon_dark_mode', 'app_icon_tinted'].map((key) => brandingAssetKind(key as 'app_icon')),
		).toEqual(['app-icon', 'app-icon', 'app-icon']);
	});
	it('accepts all seven independently configurable brand assets', () => {
		const input = Object.fromEntries(brandingAssetKeys.map((key) => [key, id]));
		expect(brandingSettingsSchema.parse(input)).toEqual(input);
	});
	it('preserves omitted fields and explicitly clears a selected asset', () => {
		expect(brandingSettingsSchema.parse({ app_icon_tinted: null })).toEqual({ app_icon_tinted: null });
	});
	it('rejects empty updates, unknown fields and non-media identifiers', () => {
		for (const input of [{}, { color: 'red' }, { app_icon: 'https://example.com/icon.png' }])
			expect(brandingSettingsSchema.safeParse(input).success).toBe(false);
	});
});
