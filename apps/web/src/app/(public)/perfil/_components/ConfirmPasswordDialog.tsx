'use client';

import { type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';

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

interface ConfirmPasswordDialogProps {
	open: boolean;
	password: string;
	error?: string;
	isSaving: boolean;
	onPasswordChange: (password: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}

/**
 * Pede a senha atual antes de salvar uma alteração sensível do perfil (o CPF).
 * Abre só quando a pessoa clica em "Salvar alterações", para não poluir o
 * formulário com um campo de credencial.
 */
export function ConfirmPasswordDialog({
	open,
	password,
	error,
	isSaving,
	onPasswordChange,
	onCancel,
	onConfirm,
}: ConfirmPasswordDialogProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// O modal é renderizado num portal, mas o evento sintético ainda sobe até o
		// formulário do perfil; sem isto ele seria submetido de novo.
		event.stopPropagation();
		onConfirm();
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !isSaving) onCancel();
			}}
		>
			<DialogContent className="max-w-md">
				<form onSubmit={handleSubmit} className="space-y-5">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
								<KeyRound className="size-5 text-slate-600 dark:text-slate-300" />
							</div>
							<div className="space-y-1">
								<DialogTitle>Confirme sua senha</DialogTitle>
								<DialogDescription>
									Para alterar o CPF, confirme sua senha atual. Você receberá um e-mail avisando da alteração.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-2">
						<Label htmlFor="profile-current-password" className="text-slate-700 dark:text-slate-200">
							Senha atual
						</Label>
						<Input
							id="profile-current-password"
							type="password"
							value={password}
							onChange={(event) => onPasswordChange(event.target.value)}
							autoComplete="current-password"
							aria-invalid={Boolean(error)}
							className="h-11 rounded-lg"
						/>
						{error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" className="rounded-lg" onClick={onCancel} disabled={isSaving}>
							Cancelar
						</Button>
						<Button type="submit" className="rounded-lg" loading={isSaving}>
							Confirmar e salvar
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
