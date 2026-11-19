'use client';

import { useState } from 'react';
import { Barcode, Check, Copy, ExternalLink, QrCode } from 'lucide-react';
import type { TransparentPayment } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

function PaymentCode({ value, label, id, action }: { value: string; label: string; id: string; action: string }) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
		} catch {
			toast({
				title: 'Não foi possível copiar',
				description: 'Selecione e copie o código abaixo.',
				variant: 'destructive',
			});
		}
	}

	return (
		<div className="space-y-2.5">
			<Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
				{label}
			</Label>
			<textarea
				id={id}
				value={value}
				readOnly
				rows={2}
				spellCheck={false}
				className="block w-full resize-none rounded-xl border bg-[#F3EEFF]/30 px-3 py-2.5 font-mono text-xs leading-relaxed text-[#231A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			/>
			<Button type="button" onClick={copy} className="h-11 w-full rounded-xl">
				<Copy className="size-4" />
				{action}
			</Button>
			{copied ? (
				<p role="status" className="flex items-center gap-1 text-xs text-primary">
					<Check className="size-3" />
					Código copiado. Cole no aplicativo do seu banco.
				</p>
			) : null}
		</div>
	);
}

function PixInstructions({ payment }: { payment: TransparentPayment }) {
	const hasQr = payment.qrCodeBase64 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payment.qrCodeBase64);

	return (
		<div className="grid items-center gap-7 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-10">
			<div className="mx-auto text-center">
				{hasQr ? (
					<div className="rounded-2xl border bg-white p-3">
						<img
							src={payment.qrCodeBase64!}
							alt="QR Code Pix para pagar esta compra"
							width={216}
							height={216}
							className="size-52 max-w-full"
						/>
					</div>
				) : (
					<div className="flex size-40 items-center justify-center rounded-2xl bg-[#F3EEFF]">
						<QrCode className="size-16 text-primary" aria-hidden="true" />
					</div>
				)}
				<p className="mt-3 text-xs text-muted-foreground">Pague com o aplicativo do seu banco</p>
			</div>
			<div className="min-w-0 space-y-5">
				<div>
					<h3 className="text-lg font-semibold">Rápido, fácil e seguro</h3>
					<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
						Leia o QR Code ou copie o código Pix para concluir.
					</p>
				</div>
				<ol className="space-y-2.5 text-sm text-muted-foreground">
					{[
						'Abra o app do seu banco e escolha Pix.',
						'Escaneie o QR Code ou cole o código abaixo.',
						'Confira o valor e confirme o pagamento.',
					].map((step, index) => (
						<li key={step} className="flex items-start gap-2.5">
							<span
								aria-hidden="true"
								className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#F3EEFF] text-xs font-semibold text-primary"
							>
								{index + 1}
							</span>
							{step}
						</li>
					))}
				</ol>
				{payment.copyPasteCode ? (
					<PaymentCode
						id="transparent-pix-code"
						value={payment.copyPasteCode}
						label="Pix copia e cola"
						action="Copiar código Pix"
					/>
				) : null}
			</div>
		</div>
	);
}
function BoletoInstructions({ payment }: { payment: TransparentPayment }) {
	return (
		<div className="grid items-start gap-7 sm:grid-cols-2 sm:gap-10">
			<div className="space-y-4">
				<div className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#F3EEFF]">
					<Barcode className="size-6 text-primary" aria-hidden="true" />
				</div>
				<h3 className="text-lg font-semibold">Pague seu boleto pelo banco</h3>
				<p className="text-sm leading-relaxed text-muted-foreground">
					Copie a linha digitável e escolha “Pagar boleto” no aplicativo do seu banco. Você também pode abrir o boleto
					para imprimir.
				</p>
				<p className="rounded-xl bg-[#F3EEFF]/70 p-4 text-sm leading-relaxed text-muted-foreground">
					A compensação pode levar até <strong className="font-medium text-foreground">3 dias úteis</strong>.{' '}
					{payment.copyPasteCode ? 'Para uma confirmação mais rápida, escolha Pagar com Pix.' : ''}
				</p>
			</div>
			<div className="min-w-0 space-y-3">
				{payment.barcode ? (
					<PaymentCode
						id="transparent-boleto-code"
						value={payment.barcode}
						label="Linha digitável do boleto"
						action="Copiar linha digitável"
					/>
				) : null}
				{payment.boletoUrl && /^https:\/\/(app\.)?abacatepay\.com\//.test(payment.boletoUrl) ? (
					<Button asChild variant="outline" className="h-11 w-full rounded-xl">
						<a href={payment.boletoUrl} target="_blank" rel="noopener noreferrer">
							<ExternalLink className="size-4" />
							Abrir boleto para impressão
						</a>
					</Button>
				) : null}
			</div>
		</div>
	);
}
export function PaymentInstructions({ payment }: { payment: TransparentPayment }) {
	if (payment.method === 'PIX') return <PixInstructions payment={payment} />;
	if (payment.method === 'CARD')
		return (
			<p className="py-5 text-sm text-muted-foreground">
				Estamos aguardando a autorização do cartão. A confirmação aparecerá aqui automaticamente.
			</p>
		);
	if (!payment.copyPasteCode) return <BoletoInstructions payment={payment} />;

	return (
		<Tabs defaultValue="boleto">
			<TabsList
				aria-label="Como pagar o boleto"
				className="mb-6 grid h-12 w-full grid-cols-2 rounded-xl bg-[#F3EEFF]/70 p-1 sm:w-fit"
			>
				<TabsTrigger value="boleto" className="h-10 gap-2 rounded-lg px-4">
					<Barcode className="size-4" />
					Boleto bancário
				</TabsTrigger>
				<TabsTrigger value="pix" className="h-10 gap-2 rounded-lg px-4">
					<QrCode className="size-4" />
					Pagar com Pix
				</TabsTrigger>
			</TabsList>
			<TabsContent value="boleto">
				<BoletoInstructions payment={payment} />
			</TabsContent>
			<TabsContent value="pix">
				<PixInstructions payment={payment} />
			</TabsContent>
			<p className="mt-5 text-xs text-muted-foreground">
				Escolha apenas uma forma de pagamento. Não pague o boleto e o Pix da mesma compra.
			</p>
		</Tabs>
	);
}
