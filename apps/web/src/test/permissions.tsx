import type { ReactNode, ReactElement } from 'react';
import { permissionDefinitions, type IamAccess } from '@events-manager/contracts';
import { PermissionContext } from '@/components/auth/PermissionsProvider';
import { renderWithProviders } from './render';
export const ownerAccess: IamAccess = {
	userId: 'owner',
	organizationId: 'org',
	isOwner: true,
	active: true,
	permissions: permissionDefinitions.map((p) => p.key),
	events: [],
};
export function TestPermissions({ children, access = ownerAccess }: { children: ReactNode; access?: IamAccess }) {
	return <PermissionContext.Provider value={access}>{children}</PermissionContext.Provider>;
}
export function renderAsOwner(element: ReactElement) {
	return renderWithProviders(<TestPermissions>{element}</TestPermissions>);
}
