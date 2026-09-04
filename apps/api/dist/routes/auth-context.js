export function readAccessToken(request) {
    const cookieToken = request.cookies.access_token;
    if (cookieToken)
        return cookieToken;
    const authorization = request.headers.authorization;
    return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
}
export function requireUser(request, auth) {
    return auth.authenticate(readAccessToken(request));
}
export const ACTIVE_ORGANIZER_COOKIE = 'active_organizer_id';
export async function requireOrganizer(request, auth) {
    const context = await requireUser(request, auth);
    // The cookie only expresses a preference; ownership is verified before it is
    // honoured, so a forged value cannot reach another user's organization.
    const preferred = request.cookies?.[ACTIVE_ORGANIZER_COOKIE];
    return { ...context, organizer: await auth.requireOrganizer(context.user.id, preferred) };
}
export async function requireSuperAdmin(request, auth) {
    const context = await requireUser(request, auth);
    return { ...context, profile: await auth.requireSuperAdmin(context.user.id) };
}
//# sourceMappingURL=auth-context.js.map