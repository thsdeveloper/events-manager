import { getServerPermissions } from '@/lib/auth/server-permissions';
import { OrganizerPaymentSettings } from '@/features/organizer-settings/components/OrganizerPaymentSettings';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { PayoutSettingsCard } from '@/features/organizer-settings/components/PayoutSettingsCard';
import { OrganizerProfileSettings } from '@/features/organizer-settings/components/OrganizerProfileSettings';
import { requireOrganizer } from '@/lib/auth/server-auth';
import { hasPermission } from '@events-manager/contracts';
import { EmailNotificationPreferences } from '@/features/notifications/components/EmailNotificationPreferences';

export default async function OrganizerSettingsPage() {
	const [{ organizer }, access] = await Promise.all([requireOrganizer(), getServerPermissions()]);

	return (
		<div className="w-full space-y-6">
			<PageHeader
				eyebrow="Conta do organizador"
				title="Perfil da organização"
				description="Mantenha os dados públicos e os contatos da sua organização atualizados."
				actions={
					<Badge variant="secondary">
						<ShieldCheck className="mr-2 size-4" />
						Perfil ativo
					</Badge>
				}
			/>
			<OrganizerProfileSettings organizer={organizer} />
			<OrganizerPaymentSettings />
			<EmailNotificationPreferences
				scope="organization"
				accountId={organizer.id}
				canEdit={hasPermission(access, 'organization.update')}
			/>
			{access?.isOwner && <PayoutSettingsCard organizer={organizer} />}
		</div>
	);
}
