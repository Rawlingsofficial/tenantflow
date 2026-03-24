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
import {
  Plus, Search, Building2, TrendingUp,
  FileText, DollarSign, ArrowUpRight
} from 'lucide-react'
import AddCompanyDialog from '@/components/companies/AddCompanyDialog'
import { usePropertyType } from '@/hooks/usePropertyType'
import { useMixedModeStore } from '@/store/mixedModeStore'

type Tab = 'all' | 'active' | 'inactive'

export default function CompaniesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { propertyType } = usePropertyType() // renamed from 'type'
  const { mode } = useMixedModeStore()

  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => { if (orgId) load() }, [orgId, mode, propertyType]) // updated dependency

  async function load() {
    setLoading(true)
    const db = supabase as any
    const { data } = await db.from('tenants')
      .select(`*, leases(id, status, rent_amount, service_charge,
        units(unit_code, unit_purpose, area_sqm, floor_number, buildings(name, building_type)))`)
      .eq('organization_id', orgId!)
      .eq('tenant_type', 'company')
      .order('company_name')

    let result = data ?? []
    // use propertyType instead of type
    if (propertyType === 'mixed') {
      result = result.filter((c: any) => {
        const activeLease = (c.leases ?? []).find((l: any) => l.status === 'active')
        if (!activeLease) return true
        return activeLease.units?.buildings?.building_type === 'commercial'
      })
    }

    setCompanies(result)
    setLoading(false)
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const match = !q ||
      (c.company_name ?? '').toLowerCase().includes(q) ||
      (c.industry ?? '').toLowerCase().includes(q) ||
      (c.contact_person ?? '').toLowerCase().includes(q)
    if (!match) return false
    if (tab === 'active') return c.status === 'active'
    if (tab === 'inactive') return c.status === 'inactive'
    return true
  })

  const activeCount = companies.filter(c => c.status === 'active').length
  const withLease   = companies.filter(c => (c.leases ?? []).some((l: any) => l.status === 'active')).length
  const monthlyRev  = companies.reduce((sum, c) => {
    const al = (c.leases ?? []).find((l: any) => l.status === 'active')
    return sum + (al ? Number(al.rent_amount) + Number(al.service_charge ?? 0) : 0)
  }, 0)

  const tabs = [
    { label: 'All', value: 'all' as Tab, count: companies.length },
    { label: 'Active', value: 'active' as Tab, count: activeCount },
    { label: 'Inactive', value: 'inactive' as Tab, count: companies.length - activeCount },
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeCount} active · {withLease} with lease · ${monthlyRev.toLocaleString()}/mo
            {propertyType === 'mixed' && <span className="ml-2 text-[#14b8a6] font-medium">· Commercial portfolio</span>}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}
          className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 px-4 shadow-sm">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Companies', value: companies.length, color: 'text-slate-800', icon: Building2, bg: 'bg-[#1B3B6F]', iconColor: 'text-[#14b8a6]', accentFrom: 'from-[#1B3B6F]/6' },
          { label: 'Active', value: activeCount, color: 'text-teal-600', icon: TrendingUp, bg: 'bg-teal-500/10', iconColor: 'text-teal-600', accentFrom: 'from-teal-500/5' },
          { label: 'With Active Lease', value: withLease, color: 'text-teal-600', icon: FileText, bg: 'bg-teal-500/10', iconColor: 'text-teal-600', accentFrom: 'from-teal-500/5' },
          { label: 'Monthly Revenue', value: `$${monthlyRev.toLocaleString()}`, color: 'text-slate-800', icon: DollarSign, bg: 'bg-slate-100', iconColor: 'text-slate-500', accentFrom: 'from-slate-200/30' },
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
          <Input placeholder="Search companies…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 w-52 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400/25" />
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
                <Building2 className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No companies found</p>
              <p className="text-xs text-slate-400 mt-1">{search ? 'Try a different search' : 'Add your first company to get started'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['Company', 'Industry', 'Contact', 'Current Space', 'Monthly Total', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const initial = (c.company_name ?? 'C')[0].toUpperCase()
                  const al = (c.leases ?? []).find((l: any) => l.status === 'active')
                  const total = al ? Number(al.rent_amount) + Number(al.service_charge ?? 0) : 0

                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/companies/${c.id}`)}
                    >
                      {/* Company */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-sm font-bold text-[#14b8a6]">{initial}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{c.company_name}</p>
                            {c.vat_number && <p className="text-[11px] text-slate-400">VAT: {c.vat_number}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-700">{c.industry ?? '—'}</p>
                        {c.company_size && <p className="text-[11px] text-slate-400">{c.company_size} employees</p>}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        {c.contact_person ? (
                          <div>
                            <p className="text-sm font-medium text-slate-800">{c.contact_person}</p>
                            <p className="text-[11px] text-slate-400">{c.contact_role ?? c.primary_phone ?? '—'}</p>
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>

                      {/* Space */}
                      <td className="px-4 py-3.5">
                        {al ? (
                          <div>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{al.units?.unit_code}</p>
                            <p className="text-[11px] text-slate-400">{al.units?.buildings?.name}</p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            No active lease
                          </span>
                        )}
                      </td>

                      {/* Monthly */}
                      <td className="px-4 py-3.5">
                        {al ? (
                          <span className="text-sm font-bold text-slate-900 tabular-nums">${total.toLocaleString()}</span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          c.status === 'active'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-teal-500' : 'bg-slate-400'}`} />
                          {c.status}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-3.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddCompanyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load() }}
      />
    </div>
  )
}