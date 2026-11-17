import { z } from 'zod';

export const brandingAssetKeys = [
	'logo',
	'logo_dark_mode',
	'favicon',
	'favicon_dark_mode',
	'app_icon',
	'app_icon_dark_mode',
	'app_icon_tinted',
] as const;
export type BrandingAssetKey = (typeof brandingAssetKeys)[number];
export const brandingAssetKindSchema = z.enum(['logo', 'favicon', 'app-icon']);
export type BrandingAssetKind = z.infer<typeof brandingAssetKindSchema>;
export function brandingAssetKind(key: BrandingAssetKey): BrandingAssetKind {
	return key.startsWith('logo') ? 'logo' : key.startsWith('favicon') ? 'favicon' : 'app-icon';
}
export const brandingSettingsSchema = z
	.object({
		logo: z.string().uuid().nullable().optional(),
		logo_dark_mode: z.string().uuid().nullable().optional(),
		favicon: z.string().uuid().nullable().optional(),
		favicon_dark_mode: z.string().uuid().nullable().optional(),
		app_icon: z.string().uuid().nullable().optional(),
		app_icon_dark_mode: z.string().uuid().nullable().optional(),
		app_icon_tinted: z.string().uuid().nullable().optional(),
	})
	.strict()
	.refine((input) => Object.keys(input).length > 0, 'Informe ao menos uma alteração.');
export type BrandingSettingsInput = z.infer<typeof brandingSettingsSchema>;
