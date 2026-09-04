/**
 * Branding shown in every outgoing e-mail: it comes from the `site_settings`
 * row the super admin edits, so changing the logo there changes the e-mails
 * without touching any template.
 */
export interface EmailBranding {
	accentColor: string;
	/** Absolute URL — e-mail clients cannot resolve relative paths. */
	logoUrl: string | null;
	siteName: string;
	siteUrl: string;
	supportEmail: string | null;
	tagline: string | null;
}

export interface EmailBrandingSource {
	load(): Promise<EmailBranding>;
}

const FALLBACK: Omit<EmailBranding, 'siteUrl'> = {
	accentColor: '#6644ff',
	logoUrl: null,
	siteName: 'Events Manager',
	supportEmail: null,
	tagline: null,
};

/**
 * Reads the branding row and keeps it in memory for a short while: every
 * delivery needs it, it changes rarely, and a failed read must never be the
 * reason an e-mail is not sent — hence the fallback.
 */
export class CachedEmailBranding implements EmailBrandingSource {
	private cache: { expiresAt: number; value: EmailBranding } | null = null;

	constructor(
		private readonly read: () => Promise<Partial<EmailBranding>>,
		private readonly siteUrl: string,
		private readonly ttlMs = 5 * 60_000,
		private readonly now: () => number = () => Date.now(),
	) {}

	async load(): Promise<EmailBranding> {
		const current = this.now();
		if (this.cache && this.cache.expiresAt > current) return this.cache.value;

		let value: EmailBranding = { ...FALLBACK, siteUrl: this.siteUrl };
		try {
			const row = await this.read();
			value = {
				accentColor: row.accentColor || FALLBACK.accentColor,
				logoUrl: row.logoUrl ?? FALLBACK.logoUrl,
				siteName: row.siteName || FALLBACK.siteName,
				siteUrl: row.siteUrl || this.siteUrl,
				supportEmail: row.supportEmail ?? FALLBACK.supportEmail,
				tagline: row.tagline ?? FALLBACK.tagline,
			};
		} catch {
			// Keep the fallback: branding is decoration, not a reason to drop mail.
		}

		this.cache = { expiresAt: current + this.ttlMs, value };

		return value;
	}
}
