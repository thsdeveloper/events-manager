'use client';

import { useState } from 'react';
import { Building2, CalendarPlus, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrganizerRequestForm } from './OrganizerRequestForm';

export type OrganizerRequestCardProps = {
	user: {
		id: string;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
	};
	hasPendingRequest: boolean;
	organizerStatus?: string | null;
	onSubmitted?: () => void | Promise<void>;
};

export function OrganizerRequestCard({
	user,
	hasPendingRequest,
	organizerStatus,
	onSubmitted,
}: OrganizerRequestCardProps) {
	const [showForm, setShowForm] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	const pending = hasPendingRequest || submitted;
	const normalizedStatus = organizerStatus?.toLowerCase();

	const handleSuccess = async () => {
		setSubmitted(true);
		setShowForm(false);
		await onSubmitted?.();
	};

	if (pending) {
		return (
			<Card className="border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
				<CardHeader className="space-y-1">
					<CardTitle className="flex items-center gap-2 text-2xl">
						<Clock className="size-6 text-amber-600" />
						Solicitação em análise
					</CardTitle>
					<CardDescription>
						Nossa equipe recebeu seus dados e avisaremos por email assim que o acesso for liberado.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-amber-900 dark:text-amber-100/80">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-200">
							Status atual: {normalizedStatus === 'pending' || !normalizedStatus ? 'Pendente' : organizerStatus}
						</Badge>
					</div>
					<ul className="space-y-2">
						<li className="flex items-start gap-2">
							<CheckCircle2 className="mt-0.5 size-4 text-amber-600" />
							<span>Você continuará podendo comprar ingressos normalmente enquanto avaliamos a solicitação.</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="mt-0.5 size-4 text-amber-600" />
							<span>Quando aprovado, o painel de organizador será liberado automaticamente.</span>
						</li>
					</ul>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border border-dashed border-primary/40">
			<CardHeader className="space-y-1">
				<CardTitle className="flex items-center gap-2 text-2xl">
					<Building2 className="size-6 text-primary" />
					Quero publicar meus eventos
				</CardTitle>
				<CardDescription>
					Solicite o upgrade para organizador preenchendo algumas informações sobre sua operação.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-3 text-sm text-muted-foreground">
						<p className="font-semibold text-foreground flex items-center gap-2">
							<Sparkles className="size-4 text-primary" />
							Benefícios ao virar organizador
						</p>
						<ul className="space-y-2">
							<li className="flex items-start gap-2">
								<CheckCircle2 className="mt-0.5 size-4 text-primary" />
								<span>Crie eventos pagos ou gratuitos com gestão completa de ingressos.</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle2 className="mt-0.5 size-4 text-primary" />
								<span>Acompanhe vendas em tempo real e configure repasses via AbacatePay.</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle2 className="mt-0.5 size-4 text-primary" />
								<span>Receba suporte dedicado da nossa equipe de curadoria.</span>
							</li>
						</ul>
						<Button variant="outline" onClick={() => setShowForm(true)} size="sm" className="mt-2">
							<CalendarPlus className="size-4 mr-2" />
							Preencher formulário agora
						</Button>
					</div>

					<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
						<p className="text-sm text-muted-foreground">
							Precisamos garantir que todos os organizadores publiquem experiências seguras e confiáveis. As informações
							a seguir nos ajudam a validar o seu perfil e liberar o acesso completo.
						</p>
					</div>
				</div>

				{showForm ? (
					<div className="rounded-lg border border-primary/30 bg-white dark:bg-gray-900 p-6">
						<OrganizerRequestForm user={user} onSuccess={handleSuccess} />
					</div>
				) : (
					<Button onClick={() => setShowForm(true)} className="gap-2">
						<CalendarPlus className="size-4" />
						Quero ser organizador
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
