'use client';

import { AlertCircle, Clock, UserRound } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Uma unidade de ingresso no carrinho, na ordem em que vai ser emitida. */
export interface AttendeeUnit {
	index: number;
	key: string;
	ticketId: string;
	ticketTitle: string;
	total: number;
}

/**
 * O que a pessoa decidiu para uma unidade: é dela (`me`), é de outra pessoa
 * (`named`, com nome e e-mail) ou fica para nomear depois (`later`).
 */
export interface AttendeeDraft {
	email: string;
	mode: 'me' | 'named' | 'later';
	name: string;
}

interface AttendeeCardsProps {
	buyer: { email: string; name: string };
	drafts: Record<string, AttendeeDraft>;
	errors?: Record<string, string>;
	onChange: (key: string, draft: AttendeeDraft) => void;
	units: AttendeeUnit[];
}

/**
 * Um cartão por unidade. Ingressos são nominais, mas a compra não pode travar
 * em dez formulários: cada unidade pode ficar para depois, e a pessoa nomeia na
 * área de ingressos quando souber quem vai.
 */
export function AttendeeCards({ buyer, drafts, errors = {}, onChange, units }: AttendeeCardsProps) {
	return (
		<div className="space-y-3">
			{units.map((unit) => {
				const draft = drafts[unit.key] ?? { mode: 'named', name: '', email: '' };
				const title = `${unit.ticketTitle} · ingresso ${unit.index} de ${unit.total}`;
				const error = errors[unit.key];
				const nameId = `attendee-${unit.key}-name`;
				const emailId = `attendee-${unit.key}-email`;

				return (
					<fieldset
						key={unit.key}
						aria-label={title}
						className={cn(
							'rounded-lg border p-4 transition-colors',
							draft.mode === 'me' && 'border-primary/40 bg-primary/5',
							error && 'border-destructive/50',
						)}
					>
						<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
							<legend className="float-left text-sm font-semibold text-foreground">{title}</legend>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
								<label className="inline-flex cursor-pointer items-center gap-2">
									<Checkbox
										aria-label="Este ingresso é para mim"
										checked={draft.mode === 'me'}
										onCheckedChange={(checked) =>
											onChange(unit.key, { ...draft, mode: checked === true ? 'me' : 'named' })
										}
									/>
									Este ingresso é para mim
								</label>
								<label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
									<Checkbox
										aria-label="Preencher depois"
										checked={draft.mode === 'later'}
										onCheckedChange={(checked) =>
											onChange(unit.key, { ...draft, mode: checked === true ? 'later' : 'named' })
										}
									/>
									Preencher depois
								</label>
							</div>
						</div>

						{draft.mode === 'me' ? (
							<p className="mt-3 inline-flex items-center gap-2 text-sm text-foreground">
								<UserRound className="size-4 text-primary" aria-hidden />
								<span className="font-medium">{buyer.name}</span>
								<span className="text-muted-foreground">{buyer.email}</span>
							</p>
						) : draft.mode === 'later' ? (
							<p className="mt-3 inline-flex items-start gap-2 text-sm text-muted-foreground">
								<Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
								<span>
									<strong className="block text-foreground">Pendente de nomeação</strong>
									Você pode concluir a compra e informar os dados de outra pessoa na sua área de ingressos. O ingresso
									só poderá ser validado na entrada depois da nomeação e da confirmação do pagamento. A pessoa recebe o
									ingresso por e-mail quando estiver confirmado e nomeado.
								</span>
							</p>
						) : (
							<div className="mt-3 grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor={nameId}>Nome completo</Label>
									<Input
										id={nameId}
										autoComplete="off"
										value={draft.name}
										onChange={(event) => onChange(unit.key, { ...draft, name: event.target.value })}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor={emailId}>E-mail</Label>
									<Input
										id={emailId}
										type="email"
										autoComplete="off"
										inputMode="email"
										value={draft.email}
										onChange={(event) => onChange(unit.key, { ...draft, email: event.target.value })}
									/>
								</div>
							</div>
						)}

						{error ? (
							<p role="alert" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
								<AlertCircle className="size-4" aria-hidden />
								{error}
							</p>
						) : null}
					</fieldset>
				);
			})}
		</div>
	);
}
