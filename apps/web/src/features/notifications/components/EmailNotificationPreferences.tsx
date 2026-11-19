'use client';
import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Loader2, LockKeyhole, Mail, Check } from 'lucide-react';
import { organizationEmailPreferenceOptions, userEmailPreferenceOptions } from '@events-manager/contracts';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { preferenceKey, readPreferences, savePreferences, type EmailSettings } from '../api/preferences';
export interface EmailNotificationPreferencesProps {
	scope: 'user' | 'organization';
	accountId: string;
	canEdit?: boolean;
}
export function EmailNotificationPreferences({ scope, accountId, canEdit = true }: EmailNotificationPreferencesProps) {
	const id = useId();
	const query = useQuery({
		queryKey: preferenceKey(scope, accountId),
		queryFn: ({ signal }) => readPreferences(scope, signal),
		retry: false,
		refetchOnWindowFocus: false,
	});

	return (
		<section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border bg-card shadow-sm">
			<header className="flex items-start gap-3 border-b bg-primary/5 p-6 sm:px-8">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<BellRing className="size-5" aria-hidden="true" />
				</span>
				<div>
					<h2 id={`${id}-title`} className="text-xl font-semibold">
						Notificações por e-mail
					</h2>
					<p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
						{scope === 'user'
							? 'Escolha os avisos que ajudam você a acompanhar suas compras e eventos. Suas escolhas valem em todos os dispositivos.'
							: 'Escolha quais avisos esta organização envia ao e-mail confirmado do proprietário. As preferências pessoais dele também são respeitadas.'}
					</p>
				</div>
			</header>
			<div className="p-6 sm:px-8">
				{query.isPending ? (
					<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Carregando preferências…
					</p>
				) : query.isError ? (
					<div role="alert" className="space-y-3">
						<p>Não foi possível carregar suas preferências.</p>
						<Button variant="outline" onClick={() => void query.refetch()}>
							Tentar novamente
						</Button>
					</div>
				) : (
					<PreferencesForm
						key={`${scope}-${accountId}`}
						scope={scope}
						accountId={accountId}
						canEdit={canEdit}
						initial={query.data}
					/>
				)}
			</div>
		</section>
	);
}
function PreferencesForm({
	scope,
	accountId,
	canEdit,
	initial,
}: EmailNotificationPreferencesProps & { initial: EmailSettings }) {
	const id = useId();
	const client = useQueryClient();
	const [settings, setSettings] = useState(initial);
	const [dirty, setDirty] = useState(false);
	const mutation = useMutation({
		mutationFn: (value: EmailSettings) => savePreferences(scope, value),
		onSuccess: (saved) => {
			client.setQueryData(preferenceKey(scope, accountId), saved);
			setSettings(saved);
			setDirty(false);
		},
	});
	const options = scope === 'user' ? userEmailPreferenceOptions : organizationEmailPreferenceOptions;

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (canEdit && dirty && !mutation.isPending) mutation.mutate(settings);
			}}
		>
			<div className="divide-y">
				{options.map((option) => (
					<div key={option.key} className="flex items-center justify-between gap-6 py-4 first:pt-0">
						<div className="min-w-0">
							<Label htmlFor={`${id}-${option.key}`} className="cursor-pointer text-sm font-semibold">
								{option.label}
							</Label>
							<p
								id={`${id}-${option.key}-description`}
								className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground"
							>
								{option.description}
							</p>
						</div>
						<Switch
							id={`${id}-${option.key}`}
							aria-describedby={`${id}-${option.key}-description`}
							checked={Boolean(settings[option.key as keyof EmailSettings])}
							disabled={!canEdit || mutation.isPending}
							onCheckedChange={(checked) => {
								setSettings((current) => ({ ...current, [option.key]: checked }));
								setDirty(true);
								mutation.reset();
							}}
						/>
					</div>
				))}
			</div>
			<div className="mt-5 flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
				<LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />
				<p>
					{scope === 'user'
						? 'Confirmações de compra, ingressos, reembolsos, cancelamentos de evento e avisos de segurança continuam sendo enviados. São mensagens essenciais para proteger sua conta e acompanhar suas compras.'
						: 'Estes avisos são destinados ao proprietário. Confirmações de compra e ingressos dos clientes continuam sendo enviados independentemente destas opções.'}
				</p>
			</div>
			{mutation.isError && (
				<p role="alert" className="mt-4 text-sm text-destructive">
					Não foi possível salvar suas preferências. Tente novamente.
				</p>
			)}
			<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
					{mutation.isSuccess ? (
						<>
							<Check className="size-4 text-primary" />
							Preferências de e-mail salvas.
						</>
					) : dirty ? (
						'Você tem alterações para salvar.'
					) : canEdit ? (
						'Você pode mudar suas escolhas a qualquer momento.'
					) : (
						'Você tem permissão para consultar estas preferências.'
					)}
				</p>
				{canEdit && (
					<Button type="submit" disabled={!dirty || mutation.isPending}>
						{mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
						{mutation.isPending ? 'Salvando…' : 'Salvar preferências'}
					</Button>
				)}
			</div>
		</form>
	);
}
