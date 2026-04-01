//src/app/(dashboard)/reports/tenants/page.tsx
'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, Users, UserCheck, Calendar, ArrowUpRight,
} from 'lucide-react'
import AddTenantDialog from '@/components/tenants/AddTenantDialog'

type Tab = 'all' | 'active' | 'inactive'

export default function TenantsPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = useSupabaseWithAuth()

  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('tenants')
        .select(`*, leases(id, status, rent_amount, service_charge,
          units(unit_code, unit_purpose, area_sqm, floor_number, buildings(name)))`)
        .eq('organization_id', orgId!)
        .order('first_name', { ascending: true })

      if (err) throw err
      setTenants(data ?? [])
    } catch (err: any) {
      console.error('Error loading tenants:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    const name = t.tenant_type === 'company'
      ? (t.company_name ?? '').toLowerCase()
      : `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase()
    const match = !q || name.includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      (t.primary_phone ?? '').includes(q)
    if (!match) return false
    if (tab === 'active') return t.status === 'active'
    if (tab === 'inactive') return t.status === 'inactive'
    return true
  })

  const activeCount = tenants.filter(t => t.status === 'active').length
  const withLeaseCount = tenants.filter(t => (t.leases ?? []).some((l: any) => l.status === 'active')).length

  const tabs = [
    { label: 'All',      value: 'all'      as Tab, count: tenants.length },
    { label: 'Active',   value: 'active'   as Tab, count: activeCount },
    { label: 'Inactive', value: 'inactive' as Tab, count: tenants.length - activeCount },
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
            {activeCount} active · {withLeaseCount} with active lease
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
          { label: 'Active',           value: activeCount,      color: 'text-teal-600',  icon: UserCheck,  bg: 'bg-teal-500/10',     iconColor: 'text-teal-600',  accentFrom: 'from-teal-500/5' },
          { label: 'With Active Lease', value: withLeaseCount,  color: 'text-teal-600',  icon: Calendar,   bg: 'bg-teal-500/10',     iconColor: 'text-teal-600',  accentFrom: 'from-teal-500/5' },
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
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                tab === t.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.value ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
              }`}>{t.count}</span>
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
                  {['Tenant', 'Contact', 'Lease Status', 'Current Unit', 'Monthly Rent', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant, i) => {
                  const isCompany = tenant.tenant_type === 'company'
                  const name = isCompany
                    ? tenant.company_name
                    : `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim()
                  const initials = isCompany
                    ? (tenant.company_name ?? 'C')[0].toUpperCase()
                    : `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`.toUpperCase()
                  const activeLease = (tenant.leases ?? []).find((l: any) => l.status === 'active')
                  const monthlyTotal = activeLease
                    ? Number(activeLease.rent_amount) + Number(activeLease.service_charge ?? 0)
                    : 0

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
                            {tenant.photo_url
                              ? <img src={tenant.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                              : <span className="text-sm font-bold text-[#14b8a6]">{initials}</span>
                            }
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{name || '—'}</p>
                            {tenant.email && <p className="text-[11px] text-slate-400">{tenant.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {tenant.primary_phone ? (
                          <div>
                            <p className="text-sm text-slate-700">{tenant.primary_phone}</p>
                            {tenant.secondary_phone && <p className="text-[11px] text-slate-400">{tenant.secondary_phone}</p>}
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {activeLease ? (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            Active lease
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            No active lease
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {activeLease ? (
                          <div>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{activeLease.units?.unit_code}</p>
                            <p className="text-[11px] text-slate-400">{activeLease.units?.buildings?.name}</p>
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {activeLease
                          ? <span className="text-sm font-bold text-slate-900 tabular-nums">${monthlyTotal.toLocaleString()}</span>
                          : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          tenant.status === 'active'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-teal-500' : 'bg-slate-400'}`} />
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-teal-500 transition-colors" />
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
        onSaved={() => { setAddOpen(false); load() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}


