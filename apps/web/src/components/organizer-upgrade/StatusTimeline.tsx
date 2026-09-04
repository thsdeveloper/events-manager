'use client';

import { CheckCircle2, Clock3, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function StatusTimeline({ submittedAt = new Date(), onEdit }: { submittedAt?: Date; onEdit?: () => void }) {
	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<Card className="overflow-hidden border-blue-200 shadow-sm">
				<div className="h-1.5 bg-gradient-to-r from-blue-500 to-violet-500" />
				<CardHeader>
					<div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
						<Clock3 className="size-6" />
					</div>
					<CardTitle className="text-2xl">Cadastro em análise</CardTitle>
					<CardDescription>
						Recebido em {submittedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
						Você receberá uma atualização assim que a revisão terminar.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
						<div className="flex gap-3">
							<CheckCircle2 className="mt-0.5 size-5 shrink-0" />
							<div>
								<p className="font-semibold">Nenhuma configuração de gateway é necessária agora</p>
								<p className="mt-1 leading-6">
									A equipe da plataforma administra o processamento. Depois da aprovação, você poderá criar eventos e
									cadastrar uma chave PIX para repasses.
								</p>
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-3 border-t pt-5">
						{onEdit && (
							<Button variant="outline" onClick={onEdit}>
								<Edit3 className="mr-2 size-4" />
								Editar informações
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
