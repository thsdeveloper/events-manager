'use client';
import type { OrganizerAdminRecord, OrganizerAdminUpdate } from '@events-manager/contracts';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { organizerStatusLabels } from '../lib/organizer-labels';

type Save = (input: OrganizerAdminUpdate) => Promise<boolean>;
function values(event: FormEvent<HTMLFormElement>) {
	event.preventDefault();

	return new FormData(event.currentTarget);
}
const optional = (value: FormDataEntryValue | null) => String(value ?? '').trim() || null;
function Reason({ id }: { id: string }) {
	return (
		<Label className="block space-y-2 text-sm font-medium" htmlFor={id}>
			Motivo da alteração
			<Textarea
				id={id}
				name="reason"
				required
				minLength={5}
				maxLength={1000}
				placeholder="Descreva a solicitação e a conferência realizada."
			/>
		</Label>
	);
}
export function OrganizerContactForm({
	organizer,
	save,
	busy,
}: {
	organizer: OrganizerAdminRecord;
	save: Save;
	busy: boolean;
}) {
	return (
		<Card className="p-5">
			<form
				aria-label="Dados cadastrais"
				className="space-y-4"
				onSubmit={async (event) => {
					const data = values(event);
					await save({
						name: String(data.get('name')),
						email: String(data.get('email')),
						phone: optional(data.get('phone')),
						website: optional(data.get('website')),
						description: optional(data.get('description')),
						reason: String(data.get('reason')),
					});
				}}
			>
				<h2 className="text-lg font-semibold">Dados cadastrais</h2>
				<p className="text-sm text-muted-foreground">
					Corrija os contatos da organização. O CPF/CNPJ e o responsável permanecem identificados nesta conta.
				</p>
				<Label className="block space-y-2 text-sm font-medium">
					Nome da organização
					<Input name="name" defaultValue={organizer.name} required minLength={2} maxLength={120} />
				</Label>
				<div className="grid gap-4 sm:grid-cols-2">
					<Label className="space-y-2 text-sm font-medium">
						E-mail de contato
						<Input name="email" type="email" defaultValue={organizer.email} required />
					</Label>
					<Label className="space-y-2 text-sm font-medium">
						Telefone de contato
						<Input name="phone" defaultValue={organizer.phone ?? ''} />
					</Label>
				</div>
				<Label className="block space-y-2 text-sm font-medium">
					Site
					<Input name="website" type="url" defaultValue={organizer.website ?? ''} placeholder="https://" />
				</Label>
				<Label className="block space-y-2 text-sm font-medium">
					Descrição
					<Textarea name="description" maxLength={2000} defaultValue={organizer.description ?? ''} />
				</Label>
				<Reason id="contact-reason" />
				<Button type="submit" loading={busy}>
					Salvar dados cadastrais
				</Button>
			</form>
		</Card>
	);
}
export function OrganizerStatusForm({
	organizer,
	save,
	busy,
}: {
	organizer: OrganizerAdminRecord;
	save: Save;
	busy: boolean;
}) {
	return (
		<Card className="p-5">
			<form
				aria-label="Situação da conta"
				className="space-y-4"
				onSubmit={async (event) => {
					const data = values(event);
					await save({
						status: String(data.get('status')) as OrganizerAdminRecord['status'],
						reason: String(data.get('reason')),
					});
				}}
			>
				<h2 className="text-lg font-semibold">Situação da conta</h2>
				<Label className="block space-y-2 text-sm font-medium">
					Status da conta
					<NativeSelect name="status" defaultValue={organizer.status}>
						{Object.entries(organizerStatusLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</NativeSelect>
				</Label>
				<p className="text-sm text-muted-foreground">
					Contas em análise ou arquivadas não acessam o painel de organizador. Arquivar a conta também bloqueia o PIX
					aprovado.
				</p>
				<Reason id="status-reason" />
				<Button type="submit" loading={busy}>
					Salvar status
				</Button>
			</form>
		</Card>
	);
}
