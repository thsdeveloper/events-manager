import type { ReactElement } from 'react';
import { platformPermissionDefinitions, type PlatformAccess } from '@events-manager/contracts';
import { PlatformPermissionContext } from '@/features/platform-access/PlatformPermissions';
import { renderWithProviders } from './render';
export const platformRoot: PlatformAccess = {
	userId: 'test-admin',
	active: true,
	isRoot: true,
	permissions: platformPermissionDefinitions.map((p) => p.key),
};
export function renderWithPlatformPermissions(ui: ReactElement, access: PlatformAccess = platformRoot) {
	return renderWithProviders(
		<PlatformPermissionContext.Provider value={access}>{ui}</PlatformPermissionContext.Provider>,
	);
}
