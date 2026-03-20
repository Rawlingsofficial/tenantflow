'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Users, Crown, Shield, Eye,
  UserCheck, Copy, Check,
  ChevronDown, Loader2, Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Role } from '@/types'

interface Member {
  id: string
  user_id: string
  role: string
  status: string
  users: {
    email: string
    full_name: string | null
    clerk_user_id: string
  } | null
}

const ROLE_CONFIG: Record<string, {
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
    description: 'Full access including billing & permissions',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    description: 'Manage everything except billing',
  },
  manager: {
    label: 'Manager',
    icon: UserCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    description: 'Day-to-day property management',
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    description: 'Read-only access',
  },
}

const ASSIGNABLE_ROLES: Role[] = ['admin', 'manager', 'viewer']

export default function TeamSettings() {
  const { orgId, userId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  useEffect(() => {
    if (orgId) loadMembers()
  }, [orgId])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('organization_memberships')
      .select(`
        id, user_id, role, status,
        users ( email, full_name, clerk_user_id )
      `)
      .eq('organization_id', orgId!)
      .eq('status', 'active')

    setMembers((data as Member[]) ?? [])
    setLoading(false)
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    setUpdatingRole(memberId)
    setOpenDropdown(null)
    try {
      const { error } = await (supabase as any)
  .from('organization_memberships')
  .update({ role: newRole })
  .eq('id', memberId)

      if (error) throw new Error(error.message)
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m)
      )
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setUpdatingRole(null)
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingMember(memberId)
    try {
      const { error } = await (supabase as any)
  .from('organization_memberships')
  .update({ status: 'inactive' })
  .eq('id', memberId)

      if (error) throw new Error(error.message)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setConfirmRemove(null)
    } catch (err) {
      console.error('Failed to remove member:', err)
    } finally {
      setRemovingMember(null)
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/sign-up`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Team members */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Team members ({members.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No team members yet
            </p>
          ) : (
            members.map((member) => {
              const config = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.viewer
              const RoleIcon = config.icon
              const isCurrentUser = member.users?.clerk_user_id === userId
              const isOwner = member.role === 'owner'
              const displayName = member.users?.full_name ?? member.users?.email ?? 'Unknown'

              return (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {displayName}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-slate-400">(you)</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {member.users?.email ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role badge / dropdown */}
                      {isOwner || isCurrentUser ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${config.bg} ${config.color}`}>
                          <RoleIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(
                              openDropdown === member.id ? null : member.id
                            )}
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${config.bg} ${config.color}`}
                          >
                            {updatingRole === member.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RoleIcon className="h-3 w-3" />
                            }
                            {config.label}
                            <ChevronDown className="h-3 w-3" />
                          </button>

                          {openDropdown === member.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                              {ASSIGNABLE_ROLES.map((role) => {
                                const rc = ROLE_CONFIG[role]
                                const RI = rc.icon
                                return (
                                  <button
                                    key={role}
                                    onClick={() => handleRoleChange(member.id, role)}
                                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                                      member.role === role ? 'bg-indigo-50' : ''
                                    }`}
                                  >
                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${rc.bg} ${rc.color}`}>
                                      <RI className="h-3 w-3" />
                                      {rc.label}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {rc.description}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remove button */}
                      {!isOwner && !isCurrentUser && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => setConfirmRemove(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Confirm remove */}
                  {confirmRemove === member.id && (
                    <div className="ml-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
                      <p className="text-xs text-red-700">
                        Remove <strong>{displayName}</strong> from this organization?
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setConfirmRemove(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-red-600 hover:bg-red-700"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMember === member.id}
                        >
                          {removingMember === member.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : 'Remove'
                          }
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Invite */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Invite team member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            Share the sign-up link. After signing up they will appear in your Clerk dashboard where you can add them to your organization.
          </p>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <code className="text-xs text-slate-500 flex-1 truncate">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/sign-up`
                : '/sign-up'}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-7 text-xs"
              onClick={copyInviteLink}
            >
              {copied
                ? <><Check className="h-3 w-3 mr-1 text-emerald-600" />Copied</>
                : <><Copy className="h-3 w-3 mr-1" />Copy</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}