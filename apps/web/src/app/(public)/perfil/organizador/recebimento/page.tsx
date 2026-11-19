import Container from '@/components/ui/container';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Organizer } from '@events-manager/contracts';
import { requireAuth } from '@/lib/auth/server-auth';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
export default async function ReceivingOrganizationsPage() {
	await requireAuth('/perfil/organizador/recebimento');
	const { data } = await authenticatedBackendFetch<{ data: Organizer[] }>('/api/organizer/organizations');
	const organizations = data.filter((o) => o.status !== 'archived');
	if (organizations.length === 1) redirect(`/perfil/organizador/${organizations[0].id}/recebimento`);

	return (
		<Container className="space-y-5 py-10">
			<h1 className="text-2xl font-semibold">Verificação das suas organizações</h1>
			<p className="text-muted-foreground">Escolha a conta para enviar documentos ou acompanhar sua análise.</p>
			{organizations.map((o) => (
				<Card key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
					<div>
						<h2 className="font-semibold">{o.name}</h2>
						<p className="text-sm text-muted-foreground">{o.document}</p>
					</div>
					<Button asChild variant="outline">
						<Link href={`/perfil/organizador/${o.id}/recebimento`}>Dados e documentos</Link>
					</Button>
				</Card>
			))}
			{!organizations.length && (
				<Button asChild>
					<Link href="/perfil/organizador/novo">Cadastrar organizador</Link>
				</Button>
			)}
		</Container>
	);
}
