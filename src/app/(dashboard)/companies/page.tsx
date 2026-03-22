'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Building2 } from 'lucide-react'
import AddCompanyDialog from '@/components/companies/AddCompanyDialog'
import { usePropertyType } from '@/hooks/usePropertyType'
import { useMixedModeStore } from '@/store/mixedModeStore'

type Tab = 'all' | 'active' | 'inactive'

export default function CompaniesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { type } = usePropertyType()
  const { mode } = useMixedModeStore()

  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => { if (orgId) load() }, [orgId, mode, type])

  async function load() {
    setLoading(true)
    const db = supabase as any

    // For mixed mode, filter to commercial buildings only
    let query = db.from('tenants')
      .select(`*, leases(id, status, rent_amount, service_charge,
        units(unit_code, unit_purpose, area_sqm, floor_number, buildings(name, building_type)))`)
      .eq('organization_id', orgId!)
      .eq('tenant_type', 'company')
      .order('company_name')

    const { data } = await query
    let result = data ?? []

    // In mixed mode, only show companies in commercial buildings
    if (type === 'mixed') {
      result = result.filter((c: any) => {
        const activeLease = (c.leases ?? []).find((l: any) => l.status === 'active')
        if (!activeLease) return true // show unassigned companies too
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
  const withLease = companies.filter(c => (c.leases ?? []).some((l: any) => l.status === 'active')).length
  const monthlyRev = companies.reduce((sum, c) => {
    const al = (c.leases ?? []).find((l: any) => l.status === 'active')
    return sum + (al ? Number(al.rent_amount) + Number(al.service_charge ?? 0) : 0)
  }, 0)

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Companies</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeCount} active · {withLease} with lease · ${monthlyRev.toLocaleString()}/mo
            {type === 'mixed' && <span className="ml-2 text-blue-500 font-medium">· Commercial portfolio</span>}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg gap-1.5 px-4">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Companies', value: companies.length, color: 'text-gray-800' },
          { label: 'Active', value: activeCount, color: 'text-blue-600' },
          { label: 'With Active Lease', value: withLease, color: 'text-emerald-600' },
          { label: 'Monthly Revenue', value: `$${monthlyRev.toLocaleString()}`, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          {([
            { label: 'All', value: 'all', count: companies.length },
            { label: 'Active', value: 'active', count: activeCount },
            { label: 'Inactive', value: 'inactive', count: companies.length - activeCount },
          ] as const).map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                tab === t.value ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search companies..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No companies found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Company', 'Industry', 'Contact', 'Current Space', 'Monthly Total', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const initial = (c.company_name ?? 'C')[0].toUpperCase()
                  const al = (c.leases ?? []).find((l: any) => l.status === 'active')
                  const total = al ? Number(al.rent_amount) + Number(al.service_charge ?? 0) : 0
                  return (
                    <tr key={c.id}
                      className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/companies/${c.id}`)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-700">{initial}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{c.company_name}</p>
                            {c.vat_number && <p className="text-[11px] text-gray-400">VAT: {c.vat_number}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700">{c.industry ?? '—'}</p>
                        {c.company_size && <p className="text-[11px] text-gray-400">{c.company_size} employees</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.contact_person
                          ? <div>
                              <p className="text-sm font-medium text-gray-800">{c.contact_person}</p>
                              <p className="text-[11px] text-gray-400">{c.contact_role ?? c.primary_phone ?? '—'}</p>
                            </div>
                          : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {al
                          ? <div>
                              <p className="text-sm font-semibold text-gray-800">{al.units?.unit_code}</p>
                              <p className="text-[11px] text-gray-400">{al.units?.buildings?.name}</p>
                            </div>
                          : <span className="text-xs text-amber-500 font-medium">No active lease</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {al
                          ? <p className="text-sm font-semibold text-gray-900">${total.toLocaleString()}</p>
                          : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-gray-300 group-hover:text-gray-500 text-lg">›</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddCompanyDialog open={addOpen} onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load() }} />
    </div>
  )
}
