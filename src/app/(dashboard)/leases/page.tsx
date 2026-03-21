'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, AlertTriangle, ChevronDown } from 'lucide-react'
import LeasesTable from '@/components/leases/LeasesTable'
import LeaseDetailDialog from '@/components/leases/LeaseDetailDialog'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import { differenceInDays, format, subMonths } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

type FilterTab = 'all' | 'active' | 'expiring_soon' | 'ended'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null)
  const [detailDialog, setDetailDialog] = useState(false)
  const [newLeaseDialog, setNewLeaseDialog] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => { if (orgId) loadLeases() }, [orgId])

  async function loadLeases() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`*,
        tenants(id, first_name, last_name, email, primary_phone, photo_url),
        units(id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id,
          buildings(id, name, address)),
        rent_payments(id, amount, payment_date, method, reference, status)`)
      .eq('organization_id', orgId!)
      .order('lease_start', { ascending: false })
    setLeases((data as LeaseWithDetails[]) ?? [])
    setLoading(false)
  }

  const activeLeases = leases.filter(l => l.status === 'active')
  const expiringSoon = leases.filter(l => {
    if (l.status !== 'active' || !l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), new Date()) <= 30
  })

  // Monthly revenue for chart — last 9 months
  const monthlyData = Array.from({ length: 9 }, (_, i) => {
    const month = subMonths(new Date(), 8 - i)
    const monthStr = format(month, 'yyyy-MM')
    const revenue = leases.reduce((sum, lease) => {
      const payments = (lease as any).rent_payments ?? []
      return sum + payments
        .filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(monthStr))
        .reduce((s: number, p: any) => s + Number(p.amount), 0)
    }, 0)
    return { label: format(month, 'MMM'), value: revenue }
  })
  const maxVal = Math.max(...monthlyData.map(m => m.value), 1)

  const filtered = leases.filter(l => {
    const q = search.toLowerCase()
    const t = (l as any).tenants
    const u = (l as any).units
    const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    const unit = u?.unit_code?.toLowerCase() ?? ''
    const bldg = u?.buildings?.name?.toLowerCase() ?? ''
    const matchSearch = !q || name.includes(q) || unit.includes(q) || bldg.includes(q)
    if (!matchSearch) return false
    if (filter === 'active') return l.status === 'active'
    if (filter === 'expiring_soon') return expiringSoon.some(e => e.id === l.id)
    if (filter === 'ended') return l.status === 'ended' || l.status === 'terminated'
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* ── HEADER ── */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Leases</h1>
        <Button onClick={() => setNewLeaseDialog(true)}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 px-4">
          <Plus className="h-3.5 w-3.5" /> Contact New Leases
        </Button>
      </div>

      {/* ── FILTER TABS + SEARCH ── */}
      <div className="px-6 flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          {([
            { label: 'All', value: 'all' as FilterTab },
            { label: 'Active', value: 'active' as FilterTab },
            { label: 'Expiring Soon', value: 'expiring_soon' as FilterTab },
            { label: 'Active', value: 'ended' as FilterTab },
          ]).map((tab, i) => (
            <button key={i} onClick={() => setFilter(tab.value)}
              className={`px-3.5 py-1 text-sm font-medium rounded-full transition-colors ${
                filter === tab.value
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search tenants..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-44 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* ── FEATURE CARDS (appear first, matching image) ── */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-5">

        {/* Card 1: Track and manage rent */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-emerald-400 via-teal-400 to-teal-500 p-3 flex items-center justify-center">
            <div className="w-full bg-white/20 rounded-xl p-2.5">
              <div className="flex gap-1 items-end h-10">
                {[0.35, 0.6, 0.45, 0.85, 0.55, 0.75, 0.65, 0.95, 0.7].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/60 rounded-sm" style={{ height: `${h * 100}%` }} />
                ))}
              </div>
              <div className="flex gap-1 mt-1.5">
                {[0.5, 0.7, 0.4, 0.8].map((w, i) => (
                  <div key={i} className="h-1.5 bg-white/40 rounded-full" style={{ width: `${w * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-gray-900">Track and manage rent</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Rent see and many metrics setting opt in payments, records and financial to records.
            </p>
            <button className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700">
              Get Notified <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Rent Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-teal-300 via-emerald-400 to-teal-500 p-3 flex items-center justify-center">
            <div className="w-full space-y-2">
              <div className="flex gap-1.5">
                <div className="h-5 bg-white/30 rounded-lg flex-1" />
                <div className="h-5 bg-white/20 rounded-lg w-1/3" />
              </div>
              <div className="h-4 bg-white/25 rounded-lg w-full" />
              <div className="h-4 bg-white/20 rounded-lg w-4/5" />
              <div className="flex gap-1.5">
                <div className="h-3 bg-white/30 rounded flex-1" />
                <div className="h-3 bg-white/20 rounded w-1/4" />
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-gray-900">Rent Payments</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Payments detail can rent receipts, and financial records, letters to process entered accounts.
            </p>
            <button className="mt-3 text-xs text-emerald-600 font-medium hover:text-emerald-700">
              View Report
            </button>
          </div>
        </div>

        {/* Card 3: Lease Expirations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-teal-200 via-emerald-300 to-teal-400 p-3 flex items-center justify-center">
            <div className="w-full space-y-1.5">
              <div className="h-4 bg-white/30 rounded-lg w-full" />
              <div className="h-4 bg-white/25 rounded-lg w-11/12" />
              <div className="h-4 bg-white/20 rounded-lg w-4/5" />
              <div className="h-3 bg-white/20 rounded-lg w-3/4" />
              <div className="h-3 bg-white/15 rounded-lg w-2/3" />
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-gray-900">Lease Expirations</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Features documentation, setting and financial payment. Focus on total leased to payments.
            </p>
            <button className="mt-3 text-xs text-emerald-600 font-medium hover:text-emerald-700">
              View Report
            </button>
          </div>
        </div>
      </div>

      {/* ── TOTAL RENT BAR CHART ── */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Total Rent...</p>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                Last 10 Report <ChevronDown className="h-3 w-3" />
              </button>
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-lg px-2.5 py-1.5">
                <span>All</span>
                <span className="text-gray-300 mx-0.5">·</span>
                <span>4</span>
                <span className="text-gray-300 mx-0.5">·</span>
                <span>sk</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Y-axis */}
            <div className="flex flex-col justify-between text-[10px] text-gray-400 pr-1 h-28 pb-5">
              <span>1300%</span>
              <span>1000%</span>
              <span>60%</span>
            </div>
            {/* Bars + labels */}
            <div className="flex-1">
              <div className="flex items-end gap-1.5 h-20">
                {monthlyData.map((m, i) => {
                  const heightPct = maxVal > 0 ? (m.value / maxVal) * 100 : 10
                  const isHighest = m.value === Math.max(...monthlyData.map(x => x.value))
                  return (
                    <div key={i} className="flex-1 rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(heightPct, 10)}%`,
                        background: isHighest
                          ? 'linear-gradient(to top, #059669, #6ee7b7)'
                          : 'linear-gradient(to top, #a7f3d0, #d1fae5)',
                        minHeight: '8px'
                      }} />
                  )
                })}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {monthlyData.map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    <p className="text-[10px] text-gray-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LEASES TABLE (below cards and chart) ── */}
      <div className="px-6 mb-8">
        {expiringSoon.length > 0 && filter !== 'expiring_soon' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{expiringSoon.length} lease{expiringSoon.length > 1 ? 's' : ''}</span>{' '}
              expiring within 30 days
            </p>
            <button onClick={() => setFilter('expiring_soon')}
              className="ml-auto text-xs text-amber-700 font-medium underline">View all</button>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <LeasesTable
              leases={filtered}
              onViewDetail={(lease) => { setSelectedLease(lease); setDetailDialog(true) }}
            />
          )}
        </div>
      </div>

      <LeaseDetailDialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        lease={selectedLease as any}
        organizationId={orgId ?? ''}
        onUpdated={loadLeases}
      />

      <AssignTenantDialog
        open={newLeaseDialog}
        onClose={() => setNewLeaseDialog(false)}
        onSaved={() => { setNewLeaseDialog(false); loadLeases() }}
        unit={null}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}
