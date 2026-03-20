'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, Globe, BarChart3, Users, Home, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Organization } from '@/types'

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: 'Free', color: 'text-slate-600', bg: 'bg-slate-100' },
  pro: { label: 'Pro', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  enterprise: { label: 'Enterprise', color: 'text-emerald-600', bg: 'bg-emerald-100' },
}

export default function OrgSettings() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ name: '', country: '' })

  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalUnits: 0,
    totalTenants: 0,
    totalUsers: 0,
  })

  useEffect(() => {
    if (orgId) {
      loadOrg()
      loadStats()
    }
  }, [orgId])

  async function loadOrg() {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId!)
      .single() as { data: Organization | null; error: any }

    if (data) {
      setOrg(data)
      setForm({ name: data.name, country: data.country ?? '' })
    }
    setLoading(false)
  }

  async function loadStats() {
    const [buildingsRes, tenantsRes, usersRes] = await Promise.all([
      supabase.from('buildings').select('id').eq('organization_id', orgId!).eq('status', 'active'),
      supabase.from('tenants').select('id').eq('organization_id', orgId!).eq('status', 'active'),
      supabase.from('organization_memberships').select('id').eq('organization_id', orgId!).eq('status', 'active'),
    ])

    const buildingIds: string[] = (buildingsRes.data ?? []).map((b: { id: string }) => b.id)
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('building_id', buildingIds.length > 0 ? buildingIds : ['none'])

    setStats({
      totalBuildings: buildingsRes.data?.length ?? 0,
      totalUnits: units?.length ?? 0,
      totalTenants: tenantsRes.data?.length ?? 0,
      totalUsers: usersRes.data?.length ?? 0,
    })
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Organization name is required'); return }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await (supabase as any)
  .from('organizations')
  .update({
    name: form.name.trim(),
    country: form.country.trim() || null,
  })
  .eq('id', orgId!)
      if (err) throw new Error(err.message)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      loadOrg()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const plan = PLAN_LABELS[org?.plan_type ?? 'free']

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Organization details */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            Organization details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Acme Properties"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Country{' '}
              <span className="text-slate-400 text-xs">(optional)</span>
            </Label>
            <Input
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              placeholder="e.g. Cameroon"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">
              ✓ Changes saved successfully
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : 'Save changes'
            }
          </Button>
        </CardContent>
      </Card>

      {/* Plan & usage */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              Plan & usage
            </CardTitle>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${plan.bg} ${plan.color}`}>
              {plan.label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Usage meters */}
          {[
            {
              label: 'Units',
              used: stats.totalUnits,
              limit: org?.unit_limit ?? 50,
              icon: Home,
            },
            {
              label: 'Team members',
              used: stats.totalUsers,
              limit: org?.user_limit ?? 5,
              icon: Users,
            },
          ].map((item) => {
            const pct = item.limit > 0 ? Math.round((item.used / item.limit) * 100) : 0
            const isNearLimit = pct >= 80
            const isAtLimit = pct >= 100
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <item.icon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    isAtLimit ? 'text-red-500'
                    : isNearLimit ? 'text-amber-600'
                    : 'text-slate-700'
                  }`}>
                    {item.used} / {item.limit}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isAtLimit ? 'bg-red-500'
                      : isNearLimit ? 'bg-amber-500'
                      : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                {isNearLimit && (
                  <p className={`text-xs ${isAtLimit ? 'text-red-500' : 'text-amber-600'}`}>
                    {isAtLimit
                      ? `Limit reached — upgrade to add more ${item.label.toLowerCase()}`
                      : `${item.limit - item.used} ${item.label.toLowerCase()} remaining`
                    }
                  </p>
                )}
              </div>
            )
          })}

          {/* Billing link */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Need more capacity?
            </p>
            <button
              onClick={() => router.push('/billing')}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              View plans & upgrade
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Org ID */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-400" />
            Organization ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <code className="text-xs text-slate-500 flex-1 break-all">{orgId}</code>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-7 text-xs"
              onClick={() => navigator.clipboard.writeText(orgId ?? '')}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Use this ID when contacting support
          </p>
        </CardContent>
      </Card>

    </div>
  )
}

