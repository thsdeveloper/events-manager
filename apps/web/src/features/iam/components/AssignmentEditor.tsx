'use client';
import type { IamAssignment, IamRole } from '@events-manager/contracts';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { canDelegateRole } from '@/lib/auth/permission-policy';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
export type TeamEvent = { id: string; title: string };
export function AssignmentEditor({
	value,
	onChange,
	roles,
	events,
}: {
	value: IamAssignment[];
	onChange: (v: IamAssignment[]) => void;
	roles: IamRole[];
	events: TeamEvent[];
}) {
	const { access } = usePermissions();
	function update(index: number, patch: Partial<IamAssignment>) {
		onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Escolha um cargo para toda a organização ou apenas para um evento. Permissões da organização só valem no escopo
				“Todos os eventos”.
			</p>
			{value.map((assignment, index) => (
				<div key={index} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]">
					<label className="space-y-2 text-sm">
						Cargo {index + 1}
						<NativeSelect
							required
							value={assignment.roleId}
							onChange={(e) => update(index, { roleId: e.target.value })}
						>
							<option value="">Selecione um cargo</option>
							{roles
								.filter((role) => role.key !== 'owner')
								.map((role) => (
									<option key={role.id} value={role.id} disabled={!canDelegateRole(access, role, assignment.eventId)}>
										{role.name}
									</option>
								))}
						</NativeSelect>
					</label>
					<label className="space-y-2 text-sm">
						Escopo {index + 1}
						<NativeSelect
							value={assignment.eventId ?? ''}
							onChange={(e) => update(index, { eventId: e.target.value || null })}
						>
							<option value="">Todos os eventos da organização</option>
							{events.map((event) => (
								<option key={event.id} value={event.id}>
									{event.title}
								</option>
							))}
						</NativeSelect>
					</label>
					<Button
						type="button"
						variant="ghost"
						className="self-end"
						disabled={value.length === 1}
						onClick={() => onChange(value.filter((_, i) => i !== index))}
					>
						Remover atribuição {index + 1}
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				disabled={value.length >= 100}
				onClick={() => onChange([...value, { roleId: '', eventId: null }])}
			>
				Adicionar atribuição
			</Button>
		</div>
	);
}
