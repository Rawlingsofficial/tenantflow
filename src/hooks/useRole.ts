import { useOrgStore } from '@/store/orgStore'
import type { Role } from '@/types'
import { hasPermission, type Permission } from '@/lib/permissions'

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  viewer: 1,
}

export function useRole() {
  const { currentRole } = useOrgStore()

  const can = (permission: Permission): boolean => {
    if (!currentRole) return false
    return hasPermission(currentRole, permission)
  }

  const hasRole = (minimumRole: Role): boolean => {
    if (!currentRole) return false
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[minimumRole]
  }

  return {
    role: currentRole,
    isOwner: currentRole === 'owner',
    isAdmin: hasRole('admin'),
    isManager: hasRole('manager'),
    isViewer: hasRole('viewer'),
    can,
    hasRole,
    // Legacy helpers
    canEdit: hasRole('manager'),
    canDelete: hasRole('admin'),
    canManageUsers: hasRole('admin'),
    canManageOrg: currentRole === 'owner',
  }
}