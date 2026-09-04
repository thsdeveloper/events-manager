const FALLBACK = {
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
export class CachedEmailBranding {
    read;
    siteUrl;
    ttlMs;
    now;
    cache = null;
    constructor(read, siteUrl, ttlMs = 5 * 60_000, now = () => Date.now()) {
        this.read = read;
        this.siteUrl = siteUrl;
        this.ttlMs = ttlMs;
        this.now = now;
    }
    async load() {
        const current = this.now();
        if (this.cache && this.cache.expiresAt > current)
            return this.cache.value;
        let value = { ...FALLBACK, siteUrl: this.siteUrl };
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
        }
        catch {
            // Keep the fallback: branding is decoration, not a reason to drop mail.
        }
        this.cache = { expiresAt: current + this.ttlMs, value };
        return value;
    }
}
//# sourceMappingURL=email-branding.js.map