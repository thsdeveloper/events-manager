'use client';

import { useState } from 'react';
import type { NominalTicket } from '@events-manager/contracts';
import { UserRoundPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentInput, PhoneInput } from '@/components/ui/masked-inputs';
import { describeProblem } from '@/lib/problem';

interface NameAttendeeDialogProps {
	ticket: NominalTicket;
	onClose: () => void;
	onSaved: (ticket: NominalTicket) => void;
}

/**
 * Nomeia ou corrige o participante de um ingresso nominal. Só nome e e-mail
 * são obrigatórios; o servidor valida o resto e devolve o ingresso atualizado,
 * que a lista troca no lugar sem recarregar.
 */
export function NameAttendeeDialog({ ticket, onClose, onSaved }: NameAttendeeDialogProps) {
	const [name, setName] = useState(ticket.attendee_name ?? '');
	const [email, setEmail] = useState(ticket.attendee_email ?? '');
	const [phone, setPhone] = useState(ticket.attendee_phone ?? '');
	const [document, setDocument] = useState(ticket.attendee_document ?? '');
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const isNamed = Boolean(ticket.attendee_name);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!name.trim() || !email.trim()) {
			setError('Informe o nome e o e-mail de quem vai usar este ingresso.');

			return;
		}
		setIsSaving(true);
		setError(null);
		try {
			const response = await fetch(`/api/user/tickets/${ticket.id}/attendee`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					...(phone ? { phone } : {}),
					...(document ? { document } : {}),
				}),
			});
			const payload = await response.json();
			if (!response.ok) {
				setError(describeProblem(payload, 'Não foi possível salvar o participante.'));

				return;
			}
			onSaved(payload as NominalTicket);
		} catch {
			setError('Não foi possível falar com o servidor. Tente de novo.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserRoundPen className="size-5 text-primary" aria-hidden />
						{isNamed ? 'Alterar participante' : 'Informar participante'}
					</DialogTitle>
					<DialogDescription>
						{ticket.ticket_type?.title ?? 'Ingresso'} · {ticket.ticket_code}. A pessoa recebe o ingresso por e-mail
						assim que você salvar.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					<div className="space-y-2">
						<Label htmlFor="attendee-name">Nome completo</Label>
						<Input
							id="attendee-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							autoComplete="name"
							disabled={isSaving}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="attendee-email">E-mail</Label>
						<Input
							id="attendee-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							disabled={isSaving}
						/>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="attendee-phone">Telefone</Label>
							<PhoneInput id="attendee-phone" value={phone} onChange={setPhone} disabled={isSaving} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="attendee-document">CPF</Label>
							<DocumentInput id="attendee-document" value={document} onChange={setDocument} disabled={isSaving} />
						</div>
					</div>

					{error ? (
						<p role="alert" className="text-sm font-medium text-destructive">
							{error}
						</p>
					) : null}

					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Salvando...' : 'Salvar participante'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
