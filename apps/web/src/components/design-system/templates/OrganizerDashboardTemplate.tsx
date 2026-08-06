import type { OrganizerDashboard } from '@events-manager/contracts';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { OrganizerDashboardOverview } from '../organisms/OrganizerDashboardOverview';
import { PageHeader } from '../molecules/PageHeader';
import { Button } from '@/components/ui/button';

export function OrganizerDashboardTemplate({ dashboard }: { dashboard: OrganizerDashboard }) {
	return (
		<div className="space-y-8">
			<PageHeader
				actions={
					<Button asChild>
						<Link href="/admin/eventos/novo">
							<Plus aria-hidden="true" className="size-4" />
							Criar evento
						</Link>
					</Button>
				}
				description="Dados reais de eventos, participantes, vendas e receita em um único lugar."
				eyebrow="Workspace do organizador"
				title="Visão geral"
			/>
			<OrganizerDashboardOverview dashboard={dashboard} />
		</div>
	);
}
