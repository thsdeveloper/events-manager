'use client';

import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PayoutSummary } from './PayoutHistory';

function PaymentAccountStatus({
	organizer,
	payoutSummary,
}: {
	organizer: OrganizerProfile;
	payoutSummary: PayoutSummary | null;
}) {
	const status = payoutSummary?.payoutStatus ?? organizer.payout_status;
	const enabled = status === 'enabled';
	const pending = status === 'pending_review';
	const StatusIcon = enabled ? CheckCircle2 : pending ? Clock3 : WalletCards;

	return (
		<Card className="overflow-hidden">
			<CardContent className="grid gap-6 p-0 lg:grid-cols-[1.25fr_1fr]">
				<div className="p-6">
					<div className="flex items-start gap-4">
						<div
							className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-muted text-muted-foreground' : 'bg-accent text-primary'}`}
						>
							<StatusIcon className="size-6" />
						</div>
						<div>
							<p className="text-sm font-semibold text-foreground">
								{enabled
									? 'Conta de repasse habilitada'
									: pending
										? 'Dados de recebimento em análise'
										: 'Configure seus repasses'}
							</p>
							<p className="mt-1 text-sm leading-6 text-muted-foreground">
								{enabled
									? 'Sua conta está aprovada para receber repasses.'
									: pending
										? 'Você já enviou os dados. A equipe da plataforma concluirá a validação.'
										: 'Cadastre PIX ou conta bancária e envie os documentos para validação.'}
							</p>
							{
								<Button variant="link" className="mt-2 h-auto p-0" asChild>
									<Link href="/admin/financeiro/recebimento">
										{enabled || pending ? 'Gerenciar recebimento' : 'Cadastrar recebimento'}
										<ArrowRight className="ml-1.5 size-4" />
									</Link>
								</Button>
							}
						</div>
					</div>
				</div>
				<div className="border-t bg-muted p-6 lg:border-l lg:border-t-0">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						<ShieldCheck className="size-4" />
						Processamento da plataforma
					</div>
					<p className="mt-3 text-sm font-medium text-foreground">Pagamentos processados com AbacatePay</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{payoutSummary?.alert ?? `${payoutSummary?.payouts?.length ?? 0} repasse(s) no histórico.`}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

export default memo(PaymentAccountStatus);
