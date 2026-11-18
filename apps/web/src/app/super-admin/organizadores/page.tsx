import { organizerAdminQuerySchema } from '@events-manager/contracts';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { fetchPlatformOrganizers } from '@/features/super-admin/api/server';
import { OrganizerTable } from '@/features/super-admin/components/OrganizerTable';
export default async function OrganizersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | undefined>>;
}) {
	const query = organizerAdminQuerySchema.parse(await searchParams);
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query))
		if (value !== undefined && value !== '') params.set(key, String(value));
	const result = await fetchPlatformOrganizers(params.toString());

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Governança"
				title="Organizadores"
				description="Consulte as contas, acompanhe a operação e resolva solicitações de atendimento."
			/>
			<OrganizerTable key={params.toString()} result={result} query={query} />
		</div>
	);
}
