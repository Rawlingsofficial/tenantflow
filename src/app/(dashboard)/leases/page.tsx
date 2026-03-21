'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus, Search, AlertTriangle, ChevronDown,
  TrendingUp, CreditCard, Clock, ChevronRight,
  CheckCircle2, AlertCircle, DollarSign
} from 'lucide-react'
import LeasesTable from '@/components/leases/LeasesTable'
import LeaseDetailDialog from '@/components/leases/LeaseDetailDialog'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { differenceInDays, format, subMonths, isSameMonth } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

type FilterTab = 'all' | 'active' | 'expiring_soon' | 'ended'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null)
  const [detailDialog, setDetailDialog] = useState(false)
  const [newLeaseDialog, setNewLeaseDialog] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
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

  // ── COMPUTED STATS ──
  const now = new Date()
  const activeLeases = leases.filter(l => l.status === 'active')

  const expiringSoon = activeLeases.filter(l => {
    if (!l.lease_end) return false
    const days = differenceInDays(new Date(l.lease_end), now)
    return days >= 0 && days <= 30
  })

  const expiredOverdue = activeLeases.filter(l => {
    if (!l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), now) < 0
  })

  // Monthly rent expected from active leases
  const totalMonthlyRent = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)

  // Payments this month
  const allPayments = leases.flatMap(l => (l as any).rent_payments ?? [])
  const thisMonthStr = format(now, 'yyyy-MM')
  const collectedThisMonth = allPayments
    .filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonthStr))
    .reduce((s: number, p: any) => s + Number(p.amount), 0)
  const outstandingThisMonth = Math.max(0, totalMonthlyRent - collectedThisMonth)
  const collectionRate = totalMonthlyRent > 0
    ? Math.round((collectedThisMonth / totalMonthlyRent) * 100)
    : 0

  // Tenants with no payment this month (rent due)
  const unpaidThisMonth = activeLeases.filter(l => {
    const payments = (l as any).rent_payments ?? []
    return !payments.some((p: any) =>
      p.status === 'completed' && p.payment_date?.startsWith(thisMonthStr)
    )
  })

  // Monthly revenue chart — last 9 months
  const monthlyData = Array.from({ length: 9 }, (_, i) => {
    const month = subMonths(now, 8 - i)
    const ms = format(month, 'yyyy-MM')
    const val = allPayments
      .filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(ms))
      .reduce((s: number, p: any) => s + Number(p.amount), 0)
    return { label: format(month, 'MMM'), value: val }
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
    if (filter === 'expiring_soon') return expiringSoon.some(e => e.id === l.id) || expiredOverdue.some(e => e.id === l.id)
    if (filter === 'ended') return l.status === 'ended' || l.status === 'terminated'
    return true
  })

  const tabs: { label: string; value: FilterTab; count?: number; dot?: string }[] = [
    { label: 'All', value: 'all', count: leases.length },
    { label: 'Active', value: 'active', count: activeLeases.length },
    { label: 'Expiring Soon', value: 'expiring_soon', count: expiringSoon.length + expiredOverdue.length, dot: expiredOverdue.length > 0 ? 'bg-red-500' : 'bg-amber-400' },
    { label: 'Ended', value: 'ended', count: leases.filter(l => l.status === 'ended' || l.status === 'terminated').length },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Leases</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeLeases.length} active · ${totalMonthlyRent.toLocaleString()}/mo expected
          </p>
        </div>
        <Button onClick={() => setNewLeaseDialog(true)}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 px-4">
          <Plus className="h-3.5 w-3.5" /> Create New Lease
        </Button>
      </div>

      {/* Filter tabs + search */}
      <div className="px-6 flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setFilter(tab.value)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                filter === tab.value ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {tab.dot && filter !== tab.value && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search leases..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* ── 3 FEATURE CARDS with REAL DATA ── */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-5">

        {/* Card 1: Track & Manage Rent */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-emerald-400 via-teal-400 to-teal-500 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 font-medium">Monthly Rent</p>
              <p className="text-2xl font-bold text-white mt-0.5">${totalMonthlyRent.toLocaleString()}</p>
              <p className="text-xs text-white/70 mt-1">{activeLeases.length} active leases</p>
            </div>
            <TrendingUp className="h-10 w-10 text-white/20" />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Track & Manage Rent</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {unpaidThisMonth.length > 0
                ? <><span className="text-amber-600 font-semibold">{unpaidThisMonth.length} tenant{unpaidThisMonth.length > 1 ? 's' : ''}</span> haven't paid this month</>
                : <span className="text-emerald-600 font-semibold">All tenants paid this month ✓</span>
              }
            </p>
            <button
              onClick={() => { setFilter('active'); setSearch('') }}
              className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700">
              View rent due <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Rent Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-teal-300 via-emerald-400 to-teal-500 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 font-medium">Collected This Month</p>
              <p className="text-2xl font-bold text-white mt-0.5">${collectedThisMonth.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/80 rounded-full" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
                </div>
                <p className="text-xs text-white/80 font-medium">{collectionRate}%</p>
              </div>
            </div>
            <CreditCard className="h-10 w-10 text-white/20" />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Rent Payments</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {outstandingThisMonth > 0
                ? <><span className="text-amber-600 font-semibold">${outstandingThisMonth.toLocaleString()}</span> outstanding this month</>
                : <span className="text-emerald-600 font-semibold">Fully collected this month ✓</span>
              }
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => router.push('/payments')}
                className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                View all payments
              </button>
              <span className="text-gray-200">·</span>
              <button onClick={() => setRecordPaymentOpen(true)}
                className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                Record payment
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Lease Expirations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-teal-200 via-emerald-300 to-teal-400 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70 font-medium">Expiring This Month</p>
              <p className="text-2xl font-bold text-white mt-0.5">{expiringSoon.length}</p>
              {expiredOverdue.length > 0 && (
                <p className="text-xs text-white/90 font-semibold mt-1">
                  +{expiredOverdue.length} already expired
                </p>
              )}
            </div>
            <Clock className="h-10 w-10 text-white/20" />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Lease Expirations</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {expiringSoon.length === 0 && expiredOverdue.length === 0
                ? <span className="text-emerald-600 font-semibold">No leases expiring soon ✓</span>
                : <>
                    {expiringSoon.length > 0 && <><span className="text-amber-600 font-semibold">{expiringSoon.length}</span> expiring in 30 days</>}
                    {expiredOverdue.length > 0 && <> · <span className="text-red-600 font-semibold">{expiredOverdue.length}</span> overdue</>}
                  </>
              }
            </p>
            <button
              onClick={() => setFilter('expiring_soon')}
              className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700">
              View expiring <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Revenue chart with REAL data and proper Y axis */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Rent Collected</p>
              <p className="text-xs text-gray-400">Last 9 months</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">
                ${allPayments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">all time collected</p>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Y-axis — real dollar amounts */}
            <div className="flex flex-col justify-between text-[10px] text-gray-400 pr-2 h-24 pb-5 text-right w-16 flex-shrink-0">
              <span>${(maxVal).toLocaleString()}</span>
              <span>${Math.round(maxVal / 2).toLocaleString()}</span>
              <span>$0</span>
            </div>
            <div className="flex-1">
              <div className="flex items-end gap-1.5 h-20">
                {monthlyData.map((m, i) => {
                  const h = maxVal > 0 ? (m.value / maxVal) * 100 : 0
                  const isCurrent = i === monthlyData.length - 1
                  const isHighest = m.value === Math.max(...monthlyData.map(x => x.value))
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      {m.value > 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          ${m.value.toLocaleString()}
                        </div>
                      )}
                      <div className="w-full rounded-t-md"
                        style={{
                          height: `${Math.max(h, m.value > 0 ? 8 : 3)}%`,
                          background: isHighest || isCurrent
                            ? 'linear-gradient(to top, #059669, #6ee7b7)'
                            : 'linear-gradient(to top, #a7f3d0, #d1fae5)',
                          minHeight: '3px',
                          opacity: m.value === 0 ? 0.3 : 1,
                        }} />
                    </div>
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

      {/* Alerts */}
      {(expiredOverdue.length > 0 || (expiringSoon.length > 0 && filter !== 'expiring_soon')) && (
        <div className="px-6 space-y-2 mb-4">
          {expiredOverdue.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">{expiredOverdue.length} lease{expiredOverdue.length > 1 ? 's' : ''}</span> have expired but are still marked active
              </p>
              <button onClick={() => setFilter('expiring_soon')}
                className="ml-auto text-xs text-red-700 font-medium underline">Resolve</button>
            </div>
          )}
          {expiringSoon.length > 0 && filter !== 'expiring_soon' && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{expiringSoon.length} lease{expiringSoon.length > 1 ? 's' : ''}</span> expiring within 30 days
              </p>
              <button onClick={() => setFilter('expiring_soon')}
                className="ml-auto text-xs text-amber-700 font-medium underline">View all</button>
            </div>
          )}
        </div>
      )}

      {/* Leases table */}
      <div className="px-6 mb-8">
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

      <RecordPaymentDialog
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        onSaved={() => { setRecordPaymentOpen(false); loadLeases() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}
