'use client'

import { Crown, Shield, UserCheck, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PERMISSION_GROUPS, ROLE_PERMISSIONS, hasPermission } from '@/lib/permissions'
import type { Role } from '@/types'
import type { Permission } from '@/lib/permissions'

const ROLES: Role[] = ['owner', 'admin', 'manager', 'viewer']

const ROLE_CONFIG: Record<Role, {
  label: string
  icon: any
  color: string
  bg: string
  description: string
}> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    description: 'Full access to everything',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    description: 'Manage everything except billing & permissions',
  },
  manager: {
    label: 'Manager',
    icon: UserCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    description: 'Day-to-day management — no team or settings access',
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    description: 'Read-only access across the app',
  },
}

export default function PermissionsSettings() {
  return (
    <div className="space-y-6">
      {/* Role overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {ROLES.map((role) => {
          const config = ROLE_CONFIG[role]
          const RoleIcon = config.icon
          const permCount = ROLE_PERMISSIONS[role].length

          return (
            <Card key={role} className="border border-slate-200 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${config.bg} ${config.color}`}>
                    <RoleIcon className="h-3 w-3" />
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{config.description}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {permCount} permissions
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Full permission matrix */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Permission matrix
          </CardTitle>
          <p className="text-xs text-slate-400">
            Assign roles to team members from the Team tab. Permissions are fixed per role.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 pr-4 text-xs font-semibold text-slate-500 w-64">
                    Permission
                  </th>
                  {ROLES.map((role) => {
                    const config = ROLE_CONFIG[role]
                    const RoleIcon = config.icon
                    return (
                      <th key={role} className="text-center py-3 px-3 w-24">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.bg} ${config.color}`}>
                          <RoleIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((group) => (
                  <>
                    {/* Group header */}
                    <tr key={group.label} className="bg-slate-50">
                      <td
                        colSpan={5}
                        className="py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        {group.label}
                      </td>
                    </tr>

                    {/* Permissions */}
                    {group.permissions.map((perm) => (
                      <tr
                        key={perm.key}
                        className="border-b border-slate-50 hover:bg-slate-50/50"
                      >
                        <td className="py-2.5 pr-4 text-sm text-slate-700">
                          {perm.label}
                        </td>
                        {ROLES.map((role) => {
                          const allowed = hasPermission(role, perm.key as Permission)
                          return (
                            <td key={role} className="py-2.5 px-3 text-center">
                              {allowed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-slate-200 mx-auto" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

