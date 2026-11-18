'use client';
import { useState } from 'react';
import {
	receivingAccountSubmissionSchema,
	receivingDocumentLabels,
	type ReceivingAccountOverview,
	type ReceivingDocumentKind,
	type ReceivingSubmission,
} from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { receivingBase, receivingRequest } from '../api/receiving-account';
import { Building2, ScanLine, UploadCloud } from 'lucide-react';
function Field({
	label,
	value,
	onChange,
	placeholder,
	required = true,
	maxLength = 160,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	required?: boolean;
	maxLength?: number;
}) {
	return (
		<Label className="block space-y-2 text-sm font-medium">
			{label}
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				required={required}
				maxLength={maxLength}
				autoComplete="off"
			/>
		</Label>
	);
}
export function ReceivingAccountForm({
	initialData,
	onSubmit,
	onCancel,
	busy,
}: {
	initialData: ReceivingAccountOverview;
	onSubmit: (input: ReceivingSubmission) => Promise<void>;
	onCancel?: () => void;
	busy: boolean;
}) {
	const { toast } = useToast();
	const initial = initialData.current?.account;
	const [method, setMethod] = useState<'pix' | 'bank_transfer'>(initial?.method ?? 'pix');
	const [expectedRequestId] = useState(initialData.organizer.current_receiving_request_id);
	const [fields, setFields] = useState<Record<string, string>>({
		...initial,
		holder_name: initial?.holder_name ?? '',
		pix_key_type: initial?.method === 'pix' ? initial.pix_key_type : 'CPF',
		pix_key: initial?.method === 'pix' ? initial.pix_key : '',
		account_type: initial?.method === 'bank_transfer' ? initial.account_type : 'checking',
	});
	const [documents, setDocuments] = useState<Partial<Record<ReceivingDocumentKind, { id: string; filename: string }>>>(
		{},
	);
	const [uploading, setUploading] = useState<Partial<Record<ReceivingDocumentKind, boolean>>>({});
	const [confirmed, setConfirmed] = useState(false);
	const set = (key: string) => (value: string) => setFields((old) => ({ ...old, [key]: value }));
	const kinds: ReceivingDocumentKind[] =
		initialData.organizer.document?.replace(/\D/g, '').length === 14
			? ['representative_identity', 'company_registration', 'account_ownership']
			: ['representative_identity', 'account_ownership'];
	const uploadingAny = Object.values(uploading).some(Boolean);
	async function upload(kind: ReceivingDocumentKind, file: File) {
		setUploading((old) => ({ ...old, [kind]: true }));
		setDocuments((old) => ({ ...old, [kind]: undefined }));
		try {
			if (file.size > 10 * 1024 * 1024) throw new Error('Cada documento pode ter até 10 MB.');
			const data = new FormData();
			data.append('file', file);
			const result = await receivingRequest<{ document: { id: string; filename: string } }>(
				`${receivingBase(initialData.organizer.id)}/documents?kind=${kind}`,
				{ method: 'POST', body: data },
			);
			setDocuments((old) => ({ ...old, [kind]: result.document }));
		} catch (error) {
			toast({
				title: 'Documento não enviado',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setUploading((old) => ({ ...old, [kind]: false }));
		}
	}
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		const holder = { holder_name: fields.holder_name, holder_document: initialData.organizer.document ?? '' };
		const account =
			method === 'pix'
				? { ...holder, method, pix_key_type: fields.pix_key_type, pix_key: fields.pix_key }
				: {
						...holder,
						method,
						bank_code: fields.bank_code,
						bank_name: fields.bank_name,
						branch: fields.branch,
						branch_digit: fields.branch_digit ?? '',
						account_number: fields.account_number,
						account_digit: fields.account_digit,
						account_type: fields.account_type,
					};
		const parsed = receivingAccountSubmissionSchema.safeParse({
			account,
			document_ids: kinds.map((kind) => documents[kind]?.id),
			expected_request_id: expectedRequestId,
			confirm_ownership: confirmed,
		});
		if (!parsed.success) {
			toast({ title: 'Revise o cadastro', description: parsed.error.issues[0]?.message, variant: 'destructive' });

			return;
		}
		await onSubmit(parsed.data);
	}

	return (
		<form onSubmit={submit} className="space-y-5" aria-label="Cadastro de recebimento">
			<Card className="space-y-5 p-5 sm:p-6">
				<div>
					<h2 className="text-lg font-semibold">Como você quer receber?</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Informe uma conta de mesma titularidade da organização. O CPF/CNPJ não pode ser alterado nesta tela.
					</p>
				</div>
				<RadioGroup
					value={method}
					onValueChange={(v) => setMethod(v as typeof method)}
					className="grid gap-3 sm:grid-cols-2"
					aria-label="Forma de recebimento"
				>
					{(['pix', 'bank_transfer'] as const).map((value) => (
						<Label
							key={value}
							className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-[#743DF5] has-[[data-state=checked]]:bg-[#F3EEFF]"
						>
							<RadioGroupItem value={value} />
							{value === 'pix' ? <ScanLine className="size-5" /> : <Building2 className="size-5" />}
							<span>{value === 'pix' ? 'PIX' : 'Transferência bancária'}</span>
						</Label>
					))}
				</RadioGroup>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Nome do titular"
						value={fields.holder_name}
						onChange={set('holder_name')}
						placeholder={initialData.organizer.name}
					/>
					<Label className="block space-y-2 text-sm font-medium">
						CPF/CNPJ do titular
						<Input value={initialData.organizer.document ?? ''} readOnly />
					</Label>
				</div>
				{method === 'pix' ? (
					<div className="grid gap-4 sm:grid-cols-[200px_1fr]">
						<Label className="block space-y-2 text-sm font-medium">
							Tipo de chave PIX
							<NativeSelect value={fields.pix_key_type} onChange={(e) => set('pix_key_type')(e.target.value)}>
								{Object.entries({
									CPF: 'CPF',
									CNPJ: 'CNPJ',
									EMAIL: 'E-mail',
									PHONE: 'Telefone',
									RANDOM: 'Aleatória',
								}).map(([v, l]) => (
									<option key={v} value={v}>
										{l}
									</option>
								))}
							</NativeSelect>
						</Label>
						<Field
							label="Chave PIX"
							value={fields.pix_key}
							onChange={set('pix_key')}
							maxLength={254}
							placeholder={fields.pix_key_type === 'PHONE' ? '+5511999999999' : 'Chave vinculada ao titular'}
						/>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						<Field
							label="Código do banco"
							value={fields.bank_code ?? ''}
							onChange={set('bank_code')}
							placeholder="001"
							maxLength={3}
						/>
						<Field label="Nome do banco" value={fields.bank_name ?? ''} onChange={set('bank_name')} />
						<Field label="Agência" value={fields.branch ?? ''} onChange={set('branch')} maxLength={6} />
						<Field
							label="Dígito da agência (se houver)"
							value={fields.branch_digit ?? ''}
							onChange={set('branch_digit')}
							required={false}
							maxLength={2}
						/>
						<Field
							label="Número da conta"
							value={fields.account_number ?? ''}
							onChange={set('account_number')}
							maxLength={20}
						/>
						<Field
							label="Dígito da conta"
							value={fields.account_digit ?? ''}
							onChange={set('account_digit')}
							maxLength={2}
						/>
						<Label className="block space-y-2 text-sm font-medium">
							Tipo de conta
							<NativeSelect value={fields.account_type} onChange={(e) => set('account_type')(e.target.value)}>
								<option value="checking">Conta corrente</option>
								<option value="savings">Conta poupança</option>
							</NativeSelect>
						</Label>
						<p className="self-end text-sm text-muted-foreground">
							As transferências bancárias são realizadas pela equipe, com comprovante disponível no histórico de
							repasses.
						</p>
					</div>
				)}
			</Card>
			<Card className="space-y-5 p-5 sm:p-6">
				<div>
					<h2 className="text-lg font-semibold">Documentos para validação</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Envie arquivos legíveis em PDF, JPG ou PNG, até 10 MB cada. Se o documento tiver frente e verso, reúna ambos
						em um único PDF.
					</p>
				</div>
				{kinds.map((kind) => (
					<div key={kind} className="rounded-xl border border-dashed p-4">
						<Label className="block space-y-3">
							<span className="flex items-center gap-2 font-medium">
								<UploadCloud className="size-4" />
								{receivingDocumentLabels[kind]}
							</span>
							<Input
								type="file"
								accept="application/pdf,image/png,image/jpeg"
								disabled={busy || uploading[kind]}
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) void upload(kind, file);
								}}
							/>
						</Label>
						<p className="mt-2 text-xs text-muted-foreground">
							{kind === 'representative_identity'
								? 'RG ou CNH do responsável pela organização.'
								: kind === 'company_registration'
									? 'Contrato social, CCMEI ou documento de constituição com o CNPJ e o responsável.'
									: 'Comprovante emitido pelo banco com o nome, CPF/CNPJ e a chave PIX ou dados da conta. Oculte saldo e movimentações.'}
						</p>
						{uploading[kind] ? (
							<p role="status" className="mt-2 text-sm">
								Enviando documento…
							</p>
						) : (
							documents[kind] && (
								<p role="status" className="mt-2 break-all text-sm">
									Arquivo enviado: {documents[kind]?.filename}
								</p>
							)
						)}
					</div>
				))}
				<p className="text-xs leading-5 text-muted-foreground">
					Os documentos são privados e acessíveis somente a você e à equipe responsável pela análise. Nunca envie
					senhas, tokens ou códigos de acesso ao banco.
				</p>
				<Label className="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm leading-6">
					<Checkbox className="mt-1" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
					<span>Confirmo a titularidade da conta e a veracidade das informações e documentos enviados.</span>
				</Label>
				<div className="flex flex-wrap justify-end gap-3">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
							Cancelar edição
						</Button>
					)}
					<Button
						type="submit"
						loading={busy}
						disabled={busy || uploadingAny || !confirmed || kinds.some((k) => !documents[k])}
					>
						Enviar para análise
					</Button>
				</div>
			</Card>
		</form>
	);
}
