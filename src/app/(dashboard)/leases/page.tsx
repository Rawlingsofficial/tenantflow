'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, TrendingUp, CreditCard, Clock, ChevronRight, AlertTriangle } from 'lucide-react'
import LeasesTable from '@/components/leases/LeasesTable'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import { differenceInDays, format, subMonths } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

type FilterTab = 'all' | 'active' | 'expiring_soon' | 'ended'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [newLeaseDialog, setNewLeaseDialog] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`*, tenants(id, first_name, last_name, primary_phone, photo_url),
        units(id, unit_code, unit_type, building_id, buildings(id, name)),
        rent_payments(id, amount, payment_date, status)`)
      .eq('organization_id', orgId!)
      .order('lease_start', { ascending: false })
    setLeases((data as LeaseWithDetails[]) ?? [])
    setLoading(false)
  }

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const active = leases.filter(l => l.status === 'active')
  const totalMonthly = active.reduce((s, l) => s + Number(l.rent_amount), 0)

  const allPayments = leases.flatMap(l => (l as any).rent_payments ?? [])
  const collectedThisMonth = allPayments
    .filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
    .reduce((s: number, p: any) => s + Number(p.amount), 0)

  const unpaidCount = active.filter(l => {
    const pays = (l as any).rent_payments ?? []
    return !pays.some((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
  }).length

  const expiringSoon = active.filter(l => {
    if (!l.lease_end) return false
    const d = differenceInDays(new Date(l.lease_end), now)
    return d >= 0 && d <= 30
  })

  const expired = active.filter(l => {
    if (!l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), now) < 0
  })

  const filtered = leases.filter(l => {
    const q = search.toLowerCase()
    const t = (l as any).tenants
    const u = (l as any).units
    const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    const unit = u?.unit_code?.toLowerCase() ?? ''
    const bldg = u?.buildings?.name?.toLowerCase() ?? ''
    if (q && !name.includes(q) && !unit.includes(q) && !bldg.includes(q)) return false
    if (filter === 'active') return l.status === 'active'
    if (filter === 'expiring_soon') return expiringSoon.some(e => e.id === l.id) || expired.some(e => e.id === l.id)
    if (filter === 'ended') return l.status === 'ended' || l.status === 'terminated'
    return true
  })

  const tabs = [
    { label: 'All', value: 'all' as FilterTab, count: leases.length },
    { label: 'Active', value: 'active' as FilterTab, count: active.length },
    { label: 'Expiring Soon', value: 'expiring_soon' as FilterTab, count: expiringSoon.length + expired.length },
    { label: 'Ended', value: 'ended' as FilterTab, count: leases.filter(l => l.status !== 'active').length },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leases</h1>
          <p className="text-sm text-gray-400 mt-0.5">{active.length} active · ${totalMonthly.toLocaleString()}/mo expected</p>
        </div>
        <Button onClick={() => setNewLeaseDialog(true)}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg gap-1.5 px-4">
          <Plus className="h-3.5 w-3.5" /> Create New Lease
        </Button>
      </div>

      {/* 3 summary cards — each links to its own dedicated page */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-5">
        <button onClick={() => router.push('/leases/rent-tracker')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow group">
          <div className="h-24 bg-gradient-to-br from-emerald-400 to-teal-500 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Monthly Rent Expected</p>
              <p className="text-2xl font-bold text-white">${totalMonthly.toLocaleString()}</p>
              <p className="text-xs text-white/70 mt-0.5">{active.length} active leases</p>
            </div>
            <TrendingUp className="h-9 w-9 text-white/20" />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Track & Manage Rent</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {unpaidCount > 0
                  ? <span className="text-amber-600 font-medium">{unpaidCount} tenant{unpaidCount > 1 ? 's' : ''} unpaid this month</span>
                  : <span className="text-emerald-600 font-medium">All paid this month ✓</span>}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
        </button>

        <button onClick={() => router.push('/leases/rent-tracker')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow group">
          <div className="h-24 bg-gradient-to-br from-teal-400 to-emerald-500 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Collected This Month</p>
              <p className="text-2xl font-bold text-white">${collectedThisMonth.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 w-20 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/80 rounded-full"
                    style={{ width: `${totalMonthly > 0 ? Math.min((collectedThisMonth / totalMonthly) * 100, 100) : 0}%` }} />
                </div>
                <span className="text-xs text-white/80">
                  {totalMonthly > 0 ? Math.round((collectedThisMonth / totalMonthly) * 100) : 0}%
                </span>
              </div>
            </div>
            <CreditCard className="h-9 w-9 text-white/20" />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Rent Payments</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {totalMonthly - collectedThisMonth > 0
                  ? <span className="text-amber-600 font-medium">${(totalMonthly - collectedThisMonth).toLocaleString()} outstanding</span>
                  : <span className="text-emerald-600 font-medium">Fully collected ✓</span>}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
        </button>

        <button onClick={() => router.push('/leases/expirations')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow group">
          <div className="h-24 bg-gradient-to-br from-emerald-300 to-teal-400 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Expiring in 30 Days</p>
              <p className="text-2xl font-bold text-white">{expiringSoon.length}</p>
              {expired.length > 0 && <p className="text-xs text-white/90 font-semibold mt-0.5">+{expired.length} overdue</p>}
            </div>
            <Clock className="h-9 w-9 text-white/20" />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Lease Expirations</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {expiringSoon.length === 0 && expired.length === 0
                  ? <span className="text-emerald-600 font-medium">No expirations soon ✓</span>
                  : <span className="text-amber-600 font-medium">Action needed</span>}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
        </button>
      </div>

      {/* Filter tabs + search */}
      <div className="px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search leases..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Alerts */}
      {(expired.length > 0 || expiringSoon.length > 0) && filter !== 'expiring_soon' && (
        <div className="px-6 pt-3 space-y-2">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-800"><strong>{expired.length}</strong> lease{expired.length > 1 ? 's' : ''} expired but still active</span>
              <button onClick={() => router.push('/leases/expirations')} className="ml-auto text-xs text-red-700 font-medium underline">Resolve</button>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-amber-800"><strong>{expiringSoon.length}</strong> expiring within 30 days</span>
              <button onClick={() => router.push('/leases/expirations')} className="ml-auto text-xs text-amber-700 font-medium underline">View</button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="px-6 pb-8 mt-0">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading
            ? <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : <LeasesTable leases={filtered} onViewDetail={lease => router.push(`/leases/${lease.id}`)} />
          }
        </div>
      </div>

      <AssignTenantDialog open={newLeaseDialog} onClose={() => setNewLeaseDialog(false)}
        onSaved={() => { setNewLeaseDialog(false); load() }} unit={null} organizationId={orgId ?? ''} />
    </div>
  )
}


