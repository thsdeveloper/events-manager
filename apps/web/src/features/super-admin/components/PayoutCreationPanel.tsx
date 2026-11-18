'use client';

import { Card } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PayoutCreationPanel({
	organizers,
}: {
	organizers: Array<{ id: string; name: string; method?: string | null }>;
}) {
	const router = useRouter();
	const [organizerId, setOrganizerId] = useState(organizers[0]?.id ?? '');
	const [amount, setAmount] = useState('');
	const manual = organizers.find((item) => item.id === organizerId)?.method === 'bank_transfer';
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	async function create() {
		setSaving(true);
		setFeedback(null);
		try {
			const response = await fetch('/api/super-admin/finance/payouts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ organizer_id: organizerId, amount: Number(amount) }),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível criar o repasse.');
			setAmount('');
			setFeedback(
				body?.payout?.status === 'pending'
					? 'Valor reservado. Realize a transferência e registre o comprovante na página do organizador, na aba Repasses.'
					: 'Repasse registrado. Consulte o status no histórico.',
			);
			router.refresh();
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Falha ao processar repasse.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card className="p-5">
			<div className="flex items-center gap-2">
				<div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
					<ArrowUpRight className="size-5" />
				</div>
				<div>
					<h2 className="font-semibold">Novo repasse</h2>
					<p className="text-xs text-muted-foreground">
						Escolha uma conta aprovada. O saldo é reservado ao registrar o repasse.
					</p>
				</div>
			</div>
			{organizers.length ? (
				<div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
					<div className="space-y-2">
						<Label>Organizador</Label>
						<Select value={organizerId} onValueChange={setOrganizerId}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{organizers.map((organizer) => (
									<SelectItem key={organizer.id} value={organizer.id}>
										{organizer.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="payout-amount">Valor</Label>
						<CurrencyInput
							id="payout-amount"
							value={amount}
							onValueChange={(value) => setAmount(String(value))}
							placeholder="R$ 0,00"
						/>
					</div>
					<Button onClick={create} loading={saving} disabled={!organizerId || Number(amount) <= 0}>
						{manual ? 'Reservar transferência' : 'Transferir PIX'}
					</Button>
				</div>
			) : (
				<p className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
					Nenhum organizador possui dados de recebimento aprovados.
				</p>
			)}
			{manual && (
				<p className="mt-3 text-sm text-muted-foreground">
					Transferência manual: o valor será reservado, e você deverá enviar o comprovante após realizá-la.
				</p>
			)}
			{feedback && (
				<p role="status" className="mt-3 text-sm text-muted-foreground">
					{feedback}
				</p>
			)}
		</Card>
	);
}
