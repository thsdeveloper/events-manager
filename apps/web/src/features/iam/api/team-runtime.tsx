'use client';
import { createContext, useContext } from 'react';
import { permissionDefinitions, type Permission, type IamRole } from '@events-manager/contracts';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { canDelegateRole } from '@/lib/auth/permission-policy';
export type TeamRole = Omit<IamRole, 'permissions'> & { permissions: string[] };
export type TeamRoleInput = { name: string; description: string; permissions: string[] };
export interface TeamRuntime {
	scope: 'organization' | 'platform';
	userId?: string;
	contextId?: string;
	active: boolean;
	apiBase: string;
	definitions: readonly { key: string; module: string; label: string; scope?: string }[];
	can: (permission: string) => boolean;
	canAny: (permission: string) => boolean;
	canDelegate: (role: TeamRole, eventId: string | null) => boolean;
}
export const TeamRuntimeContext = createContext<TeamRuntime | null>(null);
export function useTeamRuntime(): TeamRuntime {
	const override = useContext(TeamRuntimeContext),
		{ access, can, canAny } = usePermissions();

	return (
		override ?? {
			scope: 'organization',
			userId: access?.userId,
			contextId: access?.organizationId,
			active: Boolean(access?.active),
			apiBase: '/api/organizer/iam',
			definitions: permissionDefinitions,
			can: (p) => can(p as Permission),
			canAny: (p) => canAny(p as Permission),
			canDelegate: (role, eventId) => canDelegateRole(access, role as IamRole, eventId),
		}
	);
}
