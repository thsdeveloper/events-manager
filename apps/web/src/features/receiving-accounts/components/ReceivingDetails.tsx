'use client';
import type { ReceivingRequest } from '@events-manager/contracts';
import { receivingDocumentLabels } from '@events-manager/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { FileDown, ChevronDown } from 'lucide-react';
import { receivingBase } from '../api/receiving-account';
export const receivingStatusLabels: Record<ReceivingRequest['status'], string> = {
	pending: 'Em análise',
	approved: 'Aprovado',
	rejected: 'Correção necessária',
	superseded: 'Substituído',
	legacy: 'Cadastro anterior',
};
const date = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');
export function ReceivingDetails({
	request,
	organizerId,
	admin = false,
}: {
	request: Pick<ReceivingRequest, 'account' | 'documents' | 'review_reason'> &
		Partial<Pick<ReceivingRequest, 'status' | 'reviewed_at' | 'reviewer_name'>>;
	organizerId: string;
	admin?: boolean;
}) {
	const a = request.account;
	const fields: Array<[string, string | undefined]> = [
		['Titular', a.holder_name],
		['CPF/CNPJ do titular', a.holder_document],
		['Forma de recebimento', a.method === 'pix' ? 'PIX' : 'Transferência bancária'],
		...((a.method === 'pix'
			? [
					['Tipo de chave', a.pix_key_type],
					['Chave PIX', a.pix_key],
				]
			: [
					['Banco', `${a.bank_code} · ${a.bank_name}`],
					['Agência', `${a.branch}${a.branch_digit ? `-${a.branch_digit}` : ''}`],
					['Conta', `${a.account_number}-${a.account_digit}`],
					['Tipo de conta', a.account_type === 'checking' ? 'Corrente' : 'Poupança'],
				]) as Array<[string, string]>),
	];

	return (
		<div className="space-y-4">
			<dl className="grid gap-4 text-sm sm:grid-cols-2">
				{fields.map(([label, value]) => (
					<div key={label}>
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="mt-1 break-all font-medium">{value || 'Não informado'}</dd>
					</div>
				))}
			</dl>
			{request.documents.length > 0 && (
				<div className="space-y-2 border-t pt-4">
					<p className="text-sm font-semibold">Documentos enviados</p>
					<ul className="space-y-2">
						{request.documents.map((d) => (
							<li key={d.id}>
								<Button
									asChild
									variant="outline"
									className="h-auto max-w-full justify-start whitespace-normal py-2 text-left"
								>
									<a
										href={`${receivingBase(organizerId, admin)}/documents/${d.id}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<FileDown className="mr-2 size-4 shrink-0" />
										<span>
											{receivingDocumentLabels[d.kind]} · {d.filename}
										</span>
									</a>
								</Button>
							</li>
						))}
					</ul>
				</div>
			)}
			{request.review_reason && (
				<div className="rounded-lg bg-muted p-4 text-sm">
					<p className="font-semibold">{request.status === 'legacy' ? 'Cadastro anterior' : 'Parecer da análise'}</p>
					<p className="mt-1 whitespace-pre-wrap">{request.review_reason}</p>
					{request.reviewed_at && (
						<p className="mt-2 text-xs text-muted-foreground">
							{request.reviewer_name || 'Equipe Flouvi'} · {date(request.reviewed_at)}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
export function ReceivingHistory({
	requests,
	organizerId,
	admin,
	page,
	pageCount,
	onPageChange,
}: {
	requests: ReceivingRequest[];
	organizerId: string;
	admin?: boolean;
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
}) {
	return (
		<Card className="space-y-4 p-5">
			<div>
				<h2 className="text-lg font-semibold">Histórico de cadastros</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Cada envio e sua análise ficam registrados. Apenas a versão atual aprovada pode receber novos repasses.
				</p>
			</div>
			{!requests.length && <p className="py-4 text-sm text-muted-foreground">Nenhum cadastro enviado ainda.</p>}
			{requests.map((r) => (
				<Collapsible key={r.id} className="rounded-lg border">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" className="h-auto w-full justify-between gap-3 whitespace-normal p-4 text-left">
							<span>
								Versão {r.version} · {r.account.method === 'pix' ? 'PIX' : 'Conta bancária'}
								<span className="mt-1 block text-xs font-normal text-muted-foreground">
									Enviado em {date(r.submitted_at)}
								</span>
							</span>
							<span className="flex items-center gap-2">
								<Badge variant="secondary">{receivingStatusLabels[r.status]}</Badge>
								<ChevronDown className="size-4 shrink-0" />
							</span>
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t p-4">
						<ReceivingDetails request={r} organizerId={organizerId} admin={admin} />
					</CollapsibleContent>
				</Collapsible>
			))}
			{pageCount > 1 && (
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm text-muted-foreground">
						Página {page} de {pageCount}
					</p>
					<div className="flex gap-2">
						<Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
							Anterior
						</Button>
						<Button variant="outline" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
							Próxima
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}
