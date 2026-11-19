import type { Metadata } from 'next';
import { getServerAuth } from '@/lib/auth/server-auth';
import { AcceptInvitation } from '@/features/iam/components/AcceptInvitation';
export const metadata: Metadata = {
	title: 'Convite para equipe da plataforma | Flouvi',
	robots: { index: false, follow: false },
	referrer: 'no-referrer',
};
export default async function InvitationPage() {
	const auth = await getServerAuth();

	return (
		<div className="px-4 py-12">
			<AcceptInvitation scope="platform" email={auth?.user.email} />
		</div>
	);
}
