'use client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useId } from 'react';
import type { EventTicketGroupDraft } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export function TicketGroupingEditor({
	groups,
	onChange,
	disabled = false,
}: {
	groups: EventTicketGroupDraft[];
	onChange: (groups: EventTicketGroupDraft[]) => void;
	disabled?: boolean;
}) {
	const [title, setTitle] = useState('');
	const [parent, setParent] = useState('');
	const id = useId();
	const add = () => {
		if (!title.trim()) return;
		onChange([
			...groups,
			{ client_id: crypto.randomUUID(), title: title.trim(), parent_client_id: parent || null, sort: groups.length },
		]);
		setTitle('');
	};
	const remove = (key: string) => {
		const removed = new Set([
			key,
			...groups.filter((group) => group.parent_client_id === key).map((group) => group.client_id),
		]);
		onChange(groups.filter((group) => !removed.has(group.client_id)));
		if (removed.has(parent)) setParent('');
	};

	return (
		<Card className="space-y-3 p-4">
			<h3 className="font-semibold">Grupos e subgrupos de ingressos</h3>
			<p className="text-sm text-muted-foreground">
				Organize por setor ou categoria. Cada ingresso mantém seu preço e estoque.
			</p>
			<div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
				<div>
					<Label htmlFor={id + 'title'}>Novo grupo</Label>
					<Input
						id={id + 'title'}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						maxLength={100}
						disabled={disabled}
					/>
				</div>
				<div>
					<Label htmlFor={id + 'parent'}>Grupo pai</Label>
					<Select
						value={parent || 'none'}
						onValueChange={(value) => setParent(value === 'none' ? '' : value)}
						disabled={disabled}
					>
						<SelectTrigger id={id + 'parent'}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">Grupo principal</SelectItem>
							{groups
								.filter((group) => !group.parent_client_id)
								.map((group) => (
									<SelectItem key={group.client_id} value={group.client_id}>
										{group.title}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
				<Button type="button" onClick={add} disabled={disabled || !title.trim()}>
					Adicionar grupo
				</Button>
			</div>
			<ul className="space-y-2">
				{groups.map((group) => (
					<li key={group.client_id} className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">{group.parent_client_id ? 'Subgrupo' : 'Grupo'}</span>
						<Input
							aria-label={'Nome do grupo ' + group.title}
							value={group.title}
							onChange={(e) =>
								onChange(
									groups.map((item) =>
										item.client_id === group.client_id ? { ...item, title: e.target.value } : item,
									),
								)
							}
							disabled={disabled}
							maxLength={100}
						/>
						<Button
							type="button"
							variant="ghost"
							onClick={() => remove(group.client_id)}
							disabled={disabled}
							aria-label={'Remover grupo ' + group.title}
						>
							Remover
						</Button>
					</li>
				))}
			</ul>
		</Card>
	);
}
