'use client';

import { Empty } from '@/components/ui/empty';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Coupon, CouponInput } from '@events-manager/contracts';
import { Plus, Power, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heading } from '@/components/design-system/atoms/Heading';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CouponManagerProps {
	coupons: Coupon[];
	create: (input: CouponInput) => Promise<boolean | void>;
	error: string | null;
	isSaving?: boolean;
	remove: (couponId: string) => Promise<boolean | void>;
	setStatus: (couponId: string, status: 'active' | 'inactive') => Promise<boolean | void>;
}

function describeDiscount(coupon: Coupon) {
	return coupon.discount_type === 'percentage'
		? `${Number(coupon.discount_value)}% de desconto`
		: `${formatCurrency(Number(coupon.discount_value))} de desconto`;
}

/** Sem limite, mostrar "3 de null usos" seria pior do que dizer que não há teto. */
function describeUses(coupon: Coupon) {
	return coupon.max_uses === null ? `${coupon.uses} usos · sem limite` : `${coupon.uses} de ${coupon.max_uses} usos`;
}

function describeWindow(coupon: Coupon) {
	const format = (value: string) => new Date(value).toLocaleDateString('pt-BR');
	if (coupon.starts_at && coupon.expires_at)
		return `Vale de ${format(coupon.starts_at)} a ${format(coupon.expires_at)}`;
	if (coupon.expires_at) return `Vale até ${format(coupon.expires_at)}`;
	if (coupon.starts_at) return `Vale a partir de ${format(coupon.starts_at)}`;

	return 'Sem prazo definido';
}

const emptyForm: {
	code: string;
	description: string;
	discount_type: 'percentage' | 'fixed';
	discount_value: string;
	starts_at: string;
	expires_at: string;
	max_uses: string;
} = {
	code: '',
	description: '',
	discount_type: 'percentage',
	discount_value: '10',
	starts_at: '',
	expires_at: '',
	max_uses: '',
};

export function CouponManager({ coupons, create, error, isSaving, remove, setStatus }: CouponManagerProps) {
	const [isFormOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [toDelete, setToDelete] = useState<Coupon | null>(null);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const created = await create({
			code: form.code,
			description: form.description.trim() || null,
			discount_type: form.discount_type,
			discount_value: Number(form.discount_value),
			...(form.starts_at ? { starts_at: new Date(form.starts_at).toISOString() } : {}),
			...(form.expires_at ? { expires_at: new Date(form.expires_at).toISOString() } : {}),
			...(form.max_uses ? { max_uses: Number(form.max_uses) } : {}),
		} as CouponInput);

		if (created !== false) {
			setForm(emptyForm);
			setFormOpen(false);
		}
	};

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<Heading as="h2" level="h3">
						Cupons de desconto
					</Heading>
					<p className="text-sm text-muted-foreground">O desconto é conferido pelo servidor na hora da compra.</p>
				</div>
				<Button onClick={() => setFormOpen((open) => !open)} type="button" variant={isFormOpen ? 'outline' : 'default'}>
					<Plus className="size-4" aria-hidden />
					{isFormOpen ? 'Cancelar' : 'Novo cupom'}
				</Button>
			</div>

			{error ? (
				<Alert variant="destructive" role="alert" className="border text-sm">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{isFormOpen ? (
				<form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="coupon-code-field">Código</Label>
						<Input
							id="coupon-code-field"
							value={form.code}
							onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
							placeholder="JOVENS10"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="coupon-type">Tipo de desconto</Label>
						<NativeSelect
							id="coupon-type"
							className="h-10 w-full border px-3 text-sm"
							value={form.discount_type}
							onChange={(event) => setForm({ ...form, discount_type: event.target.value as 'percentage' | 'fixed' })}
						>
							<NativeSelectOption value="percentage">Percentual (%)</NativeSelectOption>
							<NativeSelectOption value="fixed">Valor fixo (R$)</NativeSelectOption>
						</NativeSelect>
					</div>

					<div className="space-y-2">
						<Label htmlFor="coupon-value">Valor do desconto</Label>
						<Input
							id="coupon-value"
							type="number"
							min="0.01"
							step="0.01"
							max={form.discount_type === 'percentage' ? 100 : undefined}
							value={form.discount_value}
							onChange={(event) => setForm({ ...form, discount_value: event.target.value })}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="coupon-max-uses">Quantidade disponível</Label>
						<Input
							id="coupon-max-uses"
							type="number"
							min="1"
							step="1"
							value={form.max_uses}
							onChange={(event) => setForm({ ...form, max_uses: event.target.value })}
							placeholder="Sem limite"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="coupon-starts">Início</Label>
						<DateTimePicker
							id="coupon-starts"
							clearable
							date={form.starts_at ? new Date(form.starts_at) : undefined}
							setDate={(date) => setForm({ ...form, starts_at: date ? date.toISOString() : '' })}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="coupon-expires">Expiração</Label>
						<DateTimePicker
							id="coupon-expires"
							clearable
							date={form.expires_at ? new Date(form.expires_at) : undefined}
							setDate={(date) => setForm({ ...form, expires_at: date ? date.toISOString() : '' })}
						/>
					</div>

					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="coupon-description">Descrição</Label>
						<Input
							id="coupon-description"
							value={form.description}
							onChange={(event) => setForm({ ...form, description: event.target.value })}
							placeholder="Para quem é este cupom"
							maxLength={160}
						/>
					</div>

					<div className="sm:col-span-2">
						<Button disabled={isSaving} type="submit">
							{isSaving ? 'Salvando...' : 'Salvar cupom'}
						</Button>
					</div>
				</form>
			) : null}

			{coupons.length === 0 ? (
				<Empty className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
					<Tag className="mx-auto size-8 text-muted-foreground" aria-hidden />
					<p className="mt-3 text-sm text-muted-foreground">
						Nenhum cupom cadastrado ainda. Crie um para oferecer desconto neste evento.
					</p>
				</Empty>
			) : (
				<ul className="space-y-3">
					{coupons.map((coupon) => (
						<li key={coupon.id}>
							<Card
								className={cn('flex flex-wrap items-center gap-3 p-4', coupon.status === 'inactive' && 'opacity-70')}
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-semibold text-foreground">{coupon.code}</span>
										{coupon.status === 'inactive' ? <Badge variant="secondary">Inativo</Badge> : null}
									</div>
									<p className="text-sm text-muted-foreground">{describeDiscount(coupon)}</p>
									<p className="text-xs text-muted-foreground">
										<span>{describeUses(coupon)}</span>
										<span aria-hidden> · </span>
										<span>{describeWindow(coupon)}</span>
									</p>
								</div>

								<div className="flex items-center gap-1">
									<Button
										aria-label={`${coupon.status === 'active' ? 'Desativar' : 'Ativar'} ${coupon.code}`}
										onClick={() => setStatus(coupon.id, coupon.status === 'active' ? 'inactive' : 'active')}
										size="icon"
										type="button"
										variant="ghost"
									>
										<Power className="size-4" aria-hidden />
									</Button>
									<Button
										aria-label={`Excluir ${coupon.code}`}
										onClick={() => setToDelete(coupon)}
										size="icon"
										type="button"
										variant="destructive"
									>
										<Trash2 className="size-4" aria-hidden />
									</Button>
								</div>
							</Card>
						</li>
					))}
				</ul>
			)}

			<AlertDialog onOpenChange={(open) => !open && setToDelete(null)} open={toDelete !== null}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir o cupom {toDelete?.code}?</AlertDialogTitle>
						<AlertDialogDescription>
							Quem já comprou com ele mantém o desconto. Para apenas parar de aceitar novos usos, desative em vez de
							excluir.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								if (toDelete) await remove(toDelete.id);
								setToDelete(null);
							}}
						>
							Excluir cupom
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
