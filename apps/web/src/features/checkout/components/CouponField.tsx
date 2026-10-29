'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Campo para digitar um cupom. Quando o cupom é aceito, o pai deixa de renderizar
 * este campo e o resumo mostra o código na linha do desconto, com a remoção ao lado.
 */
export function CouponField({
	error,
	isApplying,
	onApply,
}: {
	error: string | null;
	isApplying?: boolean;
	onApply: (code: string) => Promise<unknown> | void;
}) {
	const [code, setCode] = useState('');

	return (
		<div className="space-y-2">
			<Label htmlFor="coupon-code" className="text-sm font-medium">
				Cupom de desconto
			</Label>
			<div className="flex gap-2">
				<Input
					id="coupon-code"
					value={code}
					onChange={(event) => setCode(event.target.value)}
					placeholder="Digite seu cupom"
					autoComplete="off"
					disabled={isApplying}
				/>
				<Button
					disabled={isApplying || code.trim().length === 0}
					onClick={() => onApply(code.trim())}
					type="button"
					variant="secondary"
				>
					{isApplying ? 'Aplicando...' : 'Aplicar'}
				</Button>
			</div>
			{error ? (
				<p role="alert" className="text-sm font-medium text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
