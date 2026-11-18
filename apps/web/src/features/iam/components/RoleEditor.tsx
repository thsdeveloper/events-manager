'use client';
import { useState } from 'react';
import { permissionDefinitions, type IamRole, type Permission, type IamRoleInput } from '@events-manager/contracts';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
export function RoleEditor({
	role,
	readOnly,
	pending,
	onSave,
}: {
	role?: IamRole;
	readOnly: boolean;
	pending: boolean;
	onSave: (input: IamRoleInput) => void;
}) {
	const { can } = usePermissions();
	const [name, setName] = useState(role?.name ?? '');
	const [description, setDescription] = useState(role?.description ?? '');
	const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? []);

	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault();
				onSave({ name, description, permissions });
			}}
		>
			<label className="block space-y-2 text-sm">
				Nome do cargo
				<Input
					required
					minLength={2}
					maxLength={80}
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={readOnly}
				/>
			</label>
			<label className="block space-y-2 text-sm">
				Descrição
				<Textarea
					maxLength={500}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					disabled={readOnly}
				/>
			</label>
			{role?.key && (
				<p className="text-sm text-muted-foreground">
					Este cargo é padrão da plataforma. Crie um cargo personalizado para definir outras permissões.
				</p>
			)}
			<div className="grid gap-4 sm:grid-cols-2">
				{[...new Set(permissionDefinitions.map((p) => p.module))].map((module) => (
					<fieldset key={module} className="space-y-3 rounded-lg border p-4">
						<legend className="px-1 text-sm font-medium">{module}</legend>
						{permissionDefinitions
							.filter((p) => p.module === module)
							.map((p) => (
								<label key={p.key} className="flex items-start gap-2 text-sm">
									<Checkbox
										checked={permissions.includes(p.key)}
										disabled={readOnly || !can(p.key)}
										onCheckedChange={(checked) =>
											setPermissions((current) =>
												checked ? [...current, p.key] : current.filter((key) => key !== p.key),
											)
										}
									/>
									<span>
										{p.label}
										{p.scope === 'organization' && (
											<span className="block text-xs text-muted-foreground">Toda a organização</span>
										)}
									</span>
								</label>
							))}
					</fieldset>
				))}
			</div>
			{!readOnly && (
				<Button type="submit" disabled={pending || !permissions.length}>
					Salvar cargo
				</Button>
			)}
		</form>
	);
}
