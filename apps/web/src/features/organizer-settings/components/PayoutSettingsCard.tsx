'use client';

import type { Organizer } from '@events-manager/contracts';
import { CheckCircle2, Clock3, KeyRound, ShieldAlert, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusCopy = {
	not_configured: {
		label: 'Dados pendentes',
		description: 'Cadastre uma chave PIX para receber repasses.',
		icon: KeyRound,
		tone: 'text-muted-foreground bg-muted border-border',
	},
	pending_review: {
		label: 'Em validação',
		description: 'A plataforma está validando os dados informados.',
		icon: Clock3,
		tone: 'text-muted-foreground bg-muted border-border',
	},
	enabled: {
		label: 'Repasses habilitados',
		description: 'Sua chave PIX está pronta para receber repasses.',
		icon: CheckCircle2,
		tone: 'text-muted-foreground bg-muted border-border',
	},
	blocked: {
		label: 'Repasses bloqueados',
		description: 'Revise os dados ou fale com o suporte da plataforma.',
		icon: ShieldAlert,
		tone: 'text-destructive bg-muted border-border',
	},
} as const;

export function PayoutSettingsCard({ organizer }: { organizer: Organizer }) {
	const [pixKey, setPixKey] = useState(organizer.payout_pix_key ?? '');
	const [pixKeyType, setPixKeyType] = useState<NonNullable<Organizer['payout_pix_key_type']>>(
		organizer.payout_pix_key_type ?? 'CPF',
	);
	const [status, setStatus] = useState<NonNullable<Organizer['payout_status']>>(
		organizer.payout_status ?? 'not_configured',
	);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
	const current = statusCopy[status];
	const StatusIcon = current.icon;

	async function save() {
		setSaving(true);
		setFeedback(null);
		try {
			const response = await fetch('/api/organizer/payout-settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ payout_pix_key: pixKey, payout_pix_key_type: pixKeyType }),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? body?.error ?? 'Não foi possível salvar os dados de repasse.');
			setStatus(body.organizer?.payout_status ?? 'pending_review');
			setFeedback({ type: 'success', message: body.message ?? 'Dados enviados para validação.' });
		} catch (error) {
			setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao salvar.' });
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card id="repasses" className="">
			<CardHeader className="gap-3">
				<div className="flex items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2 text-xl">
							<WalletCards className="size-5 text-primary" />
							Conta para repasses
						</CardTitle>
						<CardDescription className="mt-1">
							O saldo dos seus eventos é separado pela plataforma e enviado para esta chave PIX após aprovação.
						</CardDescription>
					</div>
					<Card className={`hidden items-center gap-2 px-3 py-1.5 text-xs font-semibold sm:flex ${current.tone}`}>
						<StatusIcon className="size-4" />
						{current.label}
					</Card>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				<Card className={`flex items-start gap-3 p-4 ${current.tone}`}>
					<StatusIcon className="mt-0.5 size-5 shrink-0" />
					<div>
						<p className="font-semibold">{current.label}</p>
						<p className="text-sm opacity-90">{current.description}</p>
					</div>
				</Card>
				<div className="grid gap-4 sm:grid-cols-[180px_1fr]">
					<div className="space-y-2">
						<Label htmlFor="pix-key-type">Tipo de chave</Label>
						<Select value={pixKeyType} onValueChange={(value) => setPixKeyType(value as typeof pixKeyType)}>
							<SelectTrigger id="pix-key-type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="CPF">CPF</SelectItem>
								<SelectItem value="CNPJ">CNPJ</SelectItem>
								<SelectItem value="EMAIL">E-mail</SelectItem>
								<SelectItem value="PHONE">Telefone</SelectItem>
								<SelectItem value="RANDOM">Chave aleatória</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="pix-key">Chave PIX</Label>
						<Input
							id="pix-key"
							value={pixKey}
							onChange={(event) => setPixKey(event.target.value)}
							placeholder="Informe a chave que pertence ao organizador"
							autoComplete="off"
						/>
					</div>
				</div>
				{feedback && (
					<p
						role="status"
						className={`rounded-lg px-3 py-2 text-sm ${feedback.type === 'success' ? 'bg-muted text-muted-foreground' : 'bg-muted text-destructive'}`}
					>
						{feedback.message}
					</p>
				)}
				<div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="max-w-xl text-xs leading-5 text-muted-foreground">
						Por segurança, uma alteração volta o cadastro para validação. A plataforma nunca solicita senha ou código
						bancário.
					</p>
					<Button onClick={save} disabled={saving || pixKey.trim().length < 3}>
						{saving ? 'Salvando…' : 'Salvar dados PIX'}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
