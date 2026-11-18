import type { Organizer } from '@events-manager/contracts';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
export function PayoutSettingsCard({ organizer }: { organizer: Organizer }) {
	return (
		<Card id="repasses">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck className="size-5" />
					Recebimento e verificação
				</CardTitle>
				<CardDescription>
					Gerencie PIX ou conta bancária, envie documentos e acompanhe a análise na área de recebimento.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button variant="outline" asChild>
					<Link
						href={
							organizer.status === 'active'
								? '/admin/financeiro/recebimento'
								: `/perfil/organizador/${organizer.id}/recebimento`
						}
					>
						Gerenciar recebimento
						<ArrowRight className="ml-2 size-4" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
