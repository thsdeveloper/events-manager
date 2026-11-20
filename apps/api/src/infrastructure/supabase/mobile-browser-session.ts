import type { AuthSession } from '../../application/auth/auth-service.js';
import { ApiError } from '../../shared/errors.js';
import type { SupabaseClients } from './clients.js';

/** Exchange an already authenticated identity for an independent browser session.
 * generateLink does not send email. The proof stays entirely inside the API.
 * Native refresh tokens are never shared with or rotated by the WebView.
 */
export async function createMobileBrowserSession(clients: SupabaseClients, userId: string): Promise<AuthSession> {
	const unavailable = () =>
		new ApiError('Não foi possível abrir a compra. Tente novamente.', 503, 'BROWSER_SESSION_UNAVAILABLE', undefined, {
			exposeDetail: true,
		});
	const account = await clients.admin.auth.admin.getUserById(userId);
	if (account.error) throw unavailable();
	if (!account.data.user?.email || !account.data.user.email_confirmed_at)
		throw new ApiError('Confirme seu e-mail para continuar.', 403, 'EMAIL_NOT_CONFIRMED');
	const link = await clients.admin.auth.admin.generateLink({ type: 'magiclink', email: account.data.user.email });
	const proof = link.data?.properties?.hashed_token;
	if (link.error || !proof) throw unavailable();
	const verified = await clients.createPublicClient().auth.verifyOtp({ token_hash: proof, type: 'magiclink' });
	if (verified.error || verified.data.user?.id !== userId || !verified.data.session) throw unavailable();
	const session = verified.data.session;
	return { accessToken: session.access_token, refreshToken: session.refresh_token, expiresIn: session.expires_in };
}
