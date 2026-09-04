/**
 * Reads the branding an e-mail needs straight from `site_settings` — the same
 * row the super admin edits under "Identidade visual".
 *
 * The logo is resolved to a public storage URL here rather than to the API's
 * `/api/media/:id` redirect: several e-mail clients proxy images and do not
 * follow redirects, so the direct object URL is the reliable one.
 */
export function createEmailBrandingReader(clients) {
    return async () => {
        const { data, error } = await clients.admin
            .from('site_settings')
            .select('title,tagline,url,accent_color,logo:media_files!site_settings_logo_fkey(id,bucket,path)')
            .order('date_created', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            return {};
        const logo = data.logo;
        const logoUrl = logo?.bucket && logo.path
            ? clients.public.storage.from(logo.bucket).getPublicUrl(logo.path).data.publicUrl
            : null;
        return {
            accentColor: data.accent_color ?? undefined,
            logoUrl,
            siteName: data.title ?? undefined,
            siteUrl: data.url ?? undefined,
            tagline: data.tagline ?? undefined,
        };
    };
}
//# sourceMappingURL=email-branding-repository.js.map