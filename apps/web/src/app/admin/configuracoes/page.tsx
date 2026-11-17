import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { PayoutSettingsCard } from '@/features/organizer-settings/components/PayoutSettingsCard';
import { OrganizerProfileSettings } from '@/features/organizer-settings/components/OrganizerProfileSettings';
import { requireOrganizer } from '@/lib/auth/server-auth';

export default async function OrganizerSettingsPage() {
	const { organizer } = await requireOrganizer();

	return (
		<div className="w-full space-y-6">
			<PageHeader
				eyebrow="Conta do organizador"
				title="Perfil e repasses"
				description="Mantenha os dados públicos da organização e a chave PIX de recebimento em um único lugar."
				actions={
					<Badge variant="secondary">
						<ShieldCheck className="mr-2 size-4" />
						Perfil ativo
					</Badge>
				}
			/>
			<OrganizerProfileSettings organizer={organizer} />
			<PayoutSettingsCard organizer={organizer} />
		</div>
	);
}
