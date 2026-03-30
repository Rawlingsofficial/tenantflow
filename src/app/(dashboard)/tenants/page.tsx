'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Users, ArrowUpRight, AlertTriangle, Clock, CheckCircle2, UserCheck, Calendar } from 'lucide-react'
import AddTenantDialog from '@/components/tenants/AddTenantDialog'
import type { Tenant } from '@/types'

type FilterTab = 'all' | 'active' | 'inactive' | 'due_soon' | 'overdue'

interface TenantRow extends Tenant {
  activeLease?: {
    id: string
    unit_code: string
    building_name: string
    building_type: string
    rent_amount: number
    lease_start: string
    lease_end: string | null
    last_payment_date: string | null
  }
}

export default function TenantsPage() {
  const { orgId, getToken } = useAuth()
  const router = useRouter()

  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (orgId) loadTenants()
  }, [orgId])

  async function loadTenants() {
    setLoading(true)
    const token = await getToken({ template: 'supabase' });
    const supabase = getSupabaseBrowserClient(token ?? undefined);
    const { data } = await supabase
      .from('tenants')
      .select(`*, leases(id, rent_amount, lease_start, lease_end, status,
        units(unit_code, buildings(name, building_type)),
        rent_payments(payment_date, status, amount))`)
      .eq('organization_id', orgId!)
      .order('first_name')

    const enriched: TenantRow[] = (data || []).map((t: any) => {
      const activeLease = (t.leases || []).find((l: any) => l.status === 'active')
      const lastPayment = activeLease?.rent_payments
        ?.filter((p: any) => p.status === 'completed')
        ?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())?.[0]
      return {
        ...t,
        activeLease: activeLease ? {
          id: activeLease.id,
          unit_code: activeLease.units?.unit_code,
          building_name: activeLease.units?.buildings?.name,
          building_type: activeLease.units?.buildings?.building_type ?? 'residential',
          rent_amount: activeLease.rent_amount,
          lease_start: activeLease.lease_start,
          lease_end: activeLease.lease_end,
          last_payment_date: lastPayment?.payment_date ?? null,
        } : undefined,
      }
    })

    setTenants(enriched)
    setLoading(false)
  }

  const now = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  function getPaymentStatus(t: TenantRow): 'paid' | 'due_soon' | 'overdue' | 'none' {
    if (!t.activeLease) return 'none'
    const leaseEnd = t.activeLease.lease_end ? new Date(t.activeLease.lease_end) : null
    if (leaseEnd && leaseEnd < now) return 'overdue'
    if (leaseEnd && leaseEnd < in30) return 'due_soon'
    if (t.activeLease.last_payment_date) {
      const daysSince = (now.getTime() - new Date(t.activeLease.last_payment_date).getTime()) / 86400000
      if (daysSince > 35) return 'overdue'
      if (daysSince > 25) return 'due_soon'
      return 'paid'
    }
    return 'none'
  }

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.primary_phone?.includes(q) ||
      t.activeLease?.unit_code?.toLowerCase().includes(q) ||
      t.activeLease?.building_name?.toLowerCase().includes(q)
    if (!matchSearch) return false
    const ps = getPaymentStatus(t)
    if (filter === 'active') return t.status === 'active' && !!t.activeLease
    if (filter === 'inactive') return t.status === 'inactive'
    if (filter === 'due_soon') return ps === 'due_soon'
    if (filter === 'overdue') return ps === 'overdue'
    return true
  })

  const active  = tenants.filter((t) => t.status === 'active' && t.activeLease).length
  const overdue = tenants.filter((t) => getPaymentStatus(t) === 'overdue').length
  const dueSoon = tenants.filter((t) => getPaymentStatus(t) === 'due_soon').length
  const totalRev = tenants.reduce((s, t) => s + (t.activeLease?.rent_amount || 0), 0)

  const tabs: { label: string; value: FilterTab; count?: number; dot?: string }[] = [
    { label: 'All', value: 'all', count: tenants.length },
    { label: 'Active', value: 'active', count: active },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Due Soon', value: 'due_soon', count: dueSoon, dot: 'bg-amber-400' },
    { label: 'Overdue', value: 'overdue', count: overdue, dot: 'bg-red-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-6 pt-6 pb-5 flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tenants</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} active · {tenants.length} total · ${totalRev.toLocaleString()}/mo expected
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Tenant
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="px-6 grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Tenants',    value: tenants.length,   color: 'text-slate-800', icon: Users,      bg: 'bg-[#1B3B6F]',       iconColor: 'text-[#14b8a6]', accentFrom: 'from-[#1B3B6F]/6' },
          { label: 'Active Leases',    value: active,           color: 'text-teal-600',  icon: UserCheck,  bg: 'bg-teal-500/10',     iconColor: 'text-teal-600',  accentFrom: 'from-teal-500/5' },
          { label: 'Overdue Payments', value: overdue,          color: 'text-red-600',   icon: AlertTriangle, bg: 'bg-red-500/10',      iconColor: 'text-red-600',   accentFrom: 'from-red-500/5' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm px-4 py-3.5 overflow-hidden"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${s.accentFrom} to-transparent pointer-events-none`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
              </div>
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="px-6 flex items-center justify-between">
        <div className="flex items-center gap-0.5 border-b border-slate-200">
          {tabs.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                filter === t.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === t.value ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search tenants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 w-52 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400/25"
          />
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No tenants found</p>
              <p className="text-xs text-slate-400 mt-1">{search ? 'Try a different search' : 'Add your first tenant to get started'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['Tenant', 'Contact', 'Unit', 'Monthly Rent', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant, i) => {
                  const name = `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim()
                  const initials = `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`.toUpperCase()
                  const al = tenant.activeLease
                  const ps = getPaymentStatus(tenant)

                  return (
                    <motion.tr
                      key={tenant.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/tenants/${tenant.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-sm font-bold text-[#14b8a6]">{initials || '?'}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{name || '—'}</p>
                            <p className="text-[11px] text-slate-400">{tenant.user_id ? 'Linked to App' : 'Not Linked'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-700">{tenant.primary_phone ?? '—'}</p>
                        <p className="text-[11px] text-slate-400">{tenant.email ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {al ? (
                          <div>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{al.unit_code}</p>
                            <p className="text-[11px] text-slate-400">{al.building_name}</p>
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {al ? (
                          <span className="text-sm font-bold text-slate-900 tabular-nums">${al.rent_amount.toLocaleString()}</span>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                            tenant.status === 'active' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {tenant.status}
                          </span>
                          {al && (
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                              ps === 'paid' ? 'text-teal-600' : ps === 'due_soon' ? 'text-amber-600' : ps === 'overdue' ? 'text-red-600' : 'text-slate-400'
                            }`}>
                              {ps.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors inline" />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddTenantDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); loadTenants() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}
