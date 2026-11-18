import type { SupabaseClients } from './clients.js';
/** Safe workspace card; receiving identity and bank data never reach delegated members. */
export async function memberOrganizations(clients: SupabaseClients, userId: string) {
	const { data, error } = await clients.admin
		.from('organization_members')
		.select(
			'organization:organizers!inner(id,name,status,email,phone,description,website,logo:media_files(id,bucket,path,filename))',
		)
		.eq('user_id', userId)
		.eq('status', 'active')
		.eq('organization.status', 'active');
	if (error) throw error;
	return (Array.isArray(data) ? data : []).flatMap((row) => {
		const org = row.organization as unknown as {
			id?: string;
			name?: string;
			status?: string;
			email?: string;
			phone?: string;
			description?: string;
			website?: string;
			logo?: unknown;
		} | null;
		return org?.id && org.status === 'active'
			? [
					{
						id: org.id,
						name: org.name,
						status: org.status,
						email: org.email,
						phone: org.phone,
						description: org.description,
						website: org.website,
						logo: org.logo,
					},
				]
			: [];
	});
}
