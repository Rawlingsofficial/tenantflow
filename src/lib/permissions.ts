import type { Role } from '@/types'

// ─── Permission definitions ───────────────────────────────────────────

export type Permission =
  // Tenants
  | 'tenants.view'
  | 'tenants.create'
  | 'tenants.edit'
  | 'tenants.archive'
  | 'tenants.view_id_documents'
  | 'tenants.view_occupation'
  | 'tenants.edit_notes'
  | 'tenants.export'
  | 'tenants.view_emergency_contacts'

  // Buildings & Units
  | 'buildings.view'
  | 'buildings.create'
  | 'buildings.edit'
  | 'buildings.delete'
  | 'units.view'
  | 'units.create'
  | 'units.edit'
  | 'units.delete'
  | 'units.assign_tenant'

  // Leases
  | 'leases.view'
  | 'leases.create'
  | 'leases.renew'
  | 'leases.terminate'
  | 'leases.end'

  // Payments
  | 'payments.view'
  | 'payments.record'
  | 'payments.export'

  // Reports
  | 'reports.view'
  | 'reports.export'

  // Settings
  | 'settings.view'
  | 'settings.edit_org'
  | 'settings.manage_team'
  | 'settings.manage_billing'
  | 'settings.manage_permissions'

// ─── Property type ────────────────────────────────────────────────────

export type PropertyType = 'residential' | 'commercial'  // mixed removed

/**
 * Returns true if a given section/feature is accessible for a property type.
 *
 * Rules:
 *  - 'residential' → only residential features
 *  - 'commercial'  → only commercial features
 *  - any other value (e.g., null, undefined, 'mixed' from old data) → false
 */
export function isFeatureAllowedForPropertyType(
  propertyType: PropertyType | null | undefined,
  feature: 'residential' | 'commercial'
): boolean {
  if (!propertyType) return false
  return propertyType === feature
}

/**
 * Returns which report sections are visible based on property type.
 */
export function getAllowedReportSections(
  propertyType: PropertyType | null | undefined
): ('residential' | 'commercial')[] {
  if (!propertyType) return []
  if (propertyType === 'residential') return ['residential']
  if (propertyType === 'commercial') return ['commercial']
  return []  // mixed or invalid type → no sections
}

// ─── Role permission matrix ───────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    // Full access to everything
    'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.archive',
    'tenants.view_id_documents', 'tenants.view_occupation', 'tenants.edit_notes',
    'tenants.export', 'tenants.view_emergency_contacts',
    'buildings.view', 'buildings.create', 'buildings.edit', 'buildings.delete',
    'units.view', 'units.create', 'units.edit', 'units.delete', 'units.assign_tenant',
    'leases.view', 'leases.create', 'leases.renew', 'leases.terminate', 'leases.end',
    'payments.view', 'payments.record', 'payments.export',
    'reports.view', 'reports.export',
    'settings.view', 'settings.edit_org', 'settings.manage_team',
    'settings.manage_billing', 'settings.manage_permissions',
  ],

  admin: [
    'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.archive',
    'tenants.view_id_documents', 'tenants.view_occupation', 'tenants.edit_notes',
    'tenants.export', 'tenants.view_emergency_contacts',
    'buildings.view', 'buildings.create', 'buildings.edit', 'buildings.delete',
    'units.view', 'units.create', 'units.edit', 'units.delete', 'units.assign_tenant',
    'leases.view', 'leases.create', 'leases.renew', 'leases.terminate', 'leases.end',
    'payments.view', 'payments.record', 'payments.export',
    'reports.view', 'reports.export',
    'settings.view', 'settings.edit_org', 'settings.manage_team',
  ],

  manager: [
    'tenants.view', 'tenants.create', 'tenants.edit',
    'tenants.view_occupation', 'tenants.view_emergency_contacts',
    'buildings.view', 'buildings.edit',
    'units.view', 'units.create', 'units.edit', 'units.assign_tenant',
    'leases.view', 'leases.create', 'leases.renew', 'leases.end',
    'payments.view', 'payments.record',
    'reports.view',
    'settings.view',
  ],

  viewer: [
    'tenants.view',
    'buildings.view',
    'units.view',
    'leases.view',
    'payments.view',
    'reports.view',
    'settings.view',
  ],
}

// ─── Permission groups for UI display ────────────────────────────────

export const PERMISSION_GROUPS = [
  {
    label: 'Tenants',
    permissions: [
      { key: 'tenants.view', label: 'View tenants' },
      { key: 'tenants.create', label: 'Create tenants' },
      { key: 'tenants.edit', label: 'Edit tenant info' },
      { key: 'tenants.archive', label: 'Archive tenants' },
      { key: 'tenants.view_id_documents', label: 'View ID documents' },
      { key: 'tenants.view_occupation', label: 'View occupation & employer' },
      { key: 'tenants.edit_notes', label: 'Edit internal notes' },
      { key: 'tenants.view_emergency_contacts', label: 'View emergency contacts' },
      { key: 'tenants.export', label: 'Export tenant data' },
    ] as { key: Permission; label: string }[],
  },
  {
    label: 'Buildings & Units',
    permissions: [
      { key: 'buildings.view', label: 'View buildings' },
      { key: 'buildings.create', label: 'Add buildings' },
      { key: 'buildings.edit', label: 'Edit buildings' },
      { key: 'buildings.delete', label: 'Delete buildings' },
      { key: 'units.create', label: 'Add units' },
      { key: 'units.edit', label: 'Edit units' },
      { key: 'units.delete', label: 'Delete units' },
      { key: 'units.assign_tenant', label: 'Assign tenants to units' },
    ] as { key: Permission; label: string }[],
  },
  {
    label: 'Leases',
    permissions: [
      { key: 'leases.view', label: 'View leases' },
      { key: 'leases.create', label: 'Create leases' },
      { key: 'leases.renew', label: 'Renew leases' },
      { key: 'leases.end', label: 'End leases' },
      { key: 'leases.terminate', label: 'Terminate leases (eviction)' },
    ] as { key: Permission; label: string }[],
  },
  {
    label: 'Payments',
    permissions: [
      { key: 'payments.view', label: 'View payments' },
      { key: 'payments.record', label: 'Record payments' },
      { key: 'payments.export', label: 'Export payment data' },
    ] as { key: Permission; label: string }[],
  },
  {
    label: 'Reports',
    permissions: [
      { key: 'reports.view', label: 'View reports' },
      { key: 'reports.export', label: 'Export reports' },
    ] as { key: Permission; label: string }[],
  },
  {
    label: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.edit_org', label: 'Edit organization details' },
      { key: 'settings.manage_team', label: 'Manage team members' },
      { key: 'settings.manage_billing', label: 'Manage billing' },
      { key: 'settings.manage_permissions', label: 'Manage permissions' },
    ] as { key: Permission; label: string }[],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Gate helper: returns true only if the user's role has the permission
 * AND the property type allows the feature context.
 *
 * Usage:
 *   canAccess(myRole, propertyType, 'reports.view', 'commercial')
 */
export function canAccess(
  role: Role | null | undefined,
  propertyType: PropertyType | null | undefined,
  permission: Permission,
  featureContext?: 'residential' | 'commercial'
): boolean {
  if (!role) return false
  if (!hasPermission(role, permission)) return false
  if (featureContext) {
    return isFeatureAllowedForPropertyType(propertyType, featureContext)
  }
  return true
}

