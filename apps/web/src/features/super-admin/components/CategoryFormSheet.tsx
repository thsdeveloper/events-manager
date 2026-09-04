'use client';

import { Save } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_COLORS, CATEGORY_ICON_NAMES, CATEGORY_ICONS, resolveCategoryIcon } from '@/features/categories/icons';
import { cn } from '@/lib/utils';

export interface EventCategoryRecord {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	icon: string | null;
	color: string | null;
	sort: number | null;
	eventCount: number;
}

interface CategoryFormSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	category: EventCategoryRecord | null;
	onSaved: () => void;
}

const DEFAULT_ICON = CATEGORY_ICON_NAMES[0];

export function CategoryFormSheet({ open, onOpenChange, category, onSaved }: CategoryFormSheetProps) {
	const formId = useId();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [icon, setIcon] = useState<string>(DEFAULT_ICON);
	const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setName(category?.name ?? '');
		setDescription(category?.description ?? '');
		setIcon(category?.icon ?? DEFAULT_ICON);
		setColor(category?.color ?? CATEGORY_COLORS[0]);
		setError(null);
	}, [category, open]);

	const PreviewIcon = resolveCategoryIcon(icon);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const endpoint = category
				? `/api/super-admin/categories/${category.id}`
				: '/api/super-admin/categories';
			const response = await fetch(endpoint, {
				method: category ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || null,
					icon,
					color,
				}),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar a categoria.');
			onSaved();
			onOpenChange(false);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
				<SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
					<SheetTitle>{category ? 'Editar categoria' : 'Nova categoria'}</SheetTitle>
					<SheetDescription>
						Categorias aparecem na etapa &ldquo;Básico&rdquo; do cadastro de eventos.
					</SheetDescription>
				</SheetHeader>

				<form id={formId} onSubmit={submit} className="flex-1 space-y-6 overflow-y-auto p-6">
					{/* Shows exactly what the organiser will see in the wizard. */}
					<div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
						<div
							className="flex size-11 items-center justify-center rounded-lg"
							style={{ backgroundColor: `${color}1a`, color }}
						>
							<PreviewIcon className="size-6" />
						</div>
						<div className="min-w-0">
							<p className="truncate font-semibold text-foreground">{name.trim() || 'Nome da categoria'}</p>
							<p className="truncate text-xs text-muted-foreground">
								{description.trim() || 'Descrição opcional'}
							</p>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor={`${formId}-name`}>Nome *</Label>
						<Input
							id={`${formId}-name`}
							value={name}
							onChange={event => setName(event.target.value)}
							placeholder="Ex: Gastronomia"
							maxLength={60}
							required
							autoFocus
						/>
						{category && <p className="text-xs text-muted-foreground">Endereço público: /{category.slug}</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor={`${formId}-description`}>Descrição</Label>
						<Textarea
							id={`${formId}-description`}
							value={description}
							onChange={event => setDescription(event.target.value)}
							rows={2}
							maxLength={200}
							placeholder="Ajuda o organizador a escolher a categoria certa"
							className="resize-none"
						/>
					</div>

					<fieldset className="space-y-2">
						<legend className="text-sm font-medium">Ícone</legend>
						<div className="grid grid-cols-6 gap-2">
							{CATEGORY_ICON_NAMES.map(name => {
								const { Icon, label } = CATEGORY_ICONS[name];
								const isSelected = icon === name;

								return (
									<button
										key={name}
										type="button"
										onClick={() => setIcon(name)}
										title={label}
										aria-label={label}
										aria-pressed={isSelected}
										className={cn(
											'flex aspect-square items-center justify-center rounded-lg border transition-colors',
											isSelected ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
										)}
									>
										<Icon className="size-4" />
									</button>
								);
							})}
						</div>
					</fieldset>

					<fieldset className="space-y-2">
						<legend className="text-sm font-medium">Cor</legend>
						<div className="flex flex-wrap gap-2">
							{CATEGORY_COLORS.map(option => (
								<button
									key={option}
									type="button"
									onClick={() => setColor(option)}
									aria-label={`Cor ${option}`}
									aria-pressed={color === option}
									style={{ backgroundColor: option }}
									className={cn(
										'size-8 rounded-full ring-offset-2 transition-all',
										color === option ? 'ring-2 ring-foreground' : 'hover:scale-110',
									)}
								/>
							))}
							<label className="flex items-center gap-2 rounded-lg border px-2 text-xs text-muted-foreground">
								<input
									type="color"
									value={color}
									onChange={event => setColor(event.target.value)}
									className="size-6 cursor-pointer border-0 bg-transparent p-0"
									aria-label="Escolher outra cor"
								/>
								{color}
							</label>
						</div>
					</fieldset>

					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
				</form>

				<div className="flex items-center justify-end gap-2 border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="submit" form={formId} loading={saving} disabled={name.trim().length < 2}>
						<Save className="mr-2 size-4" />
						{category ? 'Salvar' : 'Criar categoria'}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
