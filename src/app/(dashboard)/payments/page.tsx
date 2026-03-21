'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, CheckCircle2, Clock, X,
  CreditCard, DollarSign, Calendar, Building2
} from 'lucide-react'
import { format, subMonths } from 'date-fns'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'

type FilterTab = 'all' | 'completed' | 'pending' | 'failed'
type GroupBy = 'date' | 'tenant' | 'building'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  status: string
  lease_id: string
  // enriched manually
  tenant_name: string
  tenant_initials: string
  tenant_photo: string | null
  tenant_phone: string | null
  unit_code: string
  building_name: string
  lease_rent_amount: number
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  other: 'Other',
}

export default function PaymentsPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)

    // Step 1 — get all lease IDs for this org with their tenant + unit info
    const { data: leaseRows } = await supabase
      .from('leases')
      .select(`id, rent_amount,
        tenants(first_name, last_name, photo_url, primary_phone),
        units(unit_code, buildings(name))`)
      .eq('organization_id', orgId!)

    if (!leaseRows || leaseRows.length === 0) {
      setPayments([])
      setLoading(false)
      return
    }

    // Build a lookup map: lease_id → tenant/unit info
    const leaseMap = Object.fromEntries(
      leaseRows.map((l: any) => [l.id, l])
    )
    const leaseIds = leaseRows.map((l: any) => l.id)

    // Step 2 — get all payments for those leases
    const { data: payRows } = await supabase
      .from('rent_payments')
      .select('id, amount, payment_date, method, reference, status, lease_id')
      .in('lease_id', leaseIds)
      .order('payment_date', { ascending: false })

    // Step 3 — manually join tenant/unit info onto each payment
    const enriched: Payment[] = (payRows ?? []).map((p: any) => {
      const lease = leaseMap[p.lease_id]
      const t = lease?.tenants
      const u = lease?.units
      const firstName = t?.first_name ?? ''
      const lastName = t?.last_name ?? ''
      const name = `${firstName} ${lastName}`.trim()
      return {
        ...p,
        tenant_name: name || 'Unknown',
        tenant_initials: `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?',
        tenant_photo: t?.photo_url ?? null,
        tenant_phone: t?.primary_phone ?? null,
        unit_code: u?.unit_code ?? '—',
        building_name: u?.buildings?.name ?? '—',
        lease_rent_amount: Number(lease?.rent_amount ?? 0),
      }
    })

    setPayments(enriched)
    setLoading(false)
  }

  // ── STATS ──
  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const completed = payments.filter(p => p.status === 'completed')
  const pending = payments.filter(p => p.status === 'pending')
  const failed = payments.filter(p => p.status === 'failed')

  const totalAllTime = completed.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonthTotal = completed.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const lastMonthTotal = completed.filter(p => p.payment_date?.startsWith(lastMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const pendingTotal = pending.reduce((s, p) => s + Number(p.amount), 0)

  // Method breakdown for this month
  const methodBreakdown = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
    .map(m => ({
      method: m,
      label: METHOD_LABEL[m],
      count: completed.filter(p => (p.method ?? 'other') === m && p.payment_date?.startsWith(thisMonth)).length,
      amount: completed.filter(p => (p.method ?? 'other') === m && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0),
    }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.amount - a.amount)

  // Available months for the month filter
  const allMonths = Array.from(new Set(payments.map(p => p.payment_date?.substring(0, 7)).filter(Boolean)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 12)

  // ── FILTERED LIST ──
  const displayed = payments.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.tenant_name.toLowerCase().includes(q) ||
      p.unit_code.toLowerCase().includes(q) ||
      p.building_name.toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'completed') return p.status === 'completed'
    if (filter === 'pending') return p.status === 'pending'
    if (filter === 'failed') return p.status === 'failed'
    if (selectedMonth !== 'all') return p.payment_date?.startsWith(selectedMonth)
    return true
  })

  const tabs = [
    { label: 'All', value: 'all' as FilterTab, count: payments.length },
    { label: 'Completed', value: 'completed' as FilterTab, count: completed.length },
    { label: 'Pending', value: 'pending' as FilterTab, count: pending.length },
    { label: 'Failed', value: 'failed' as FilterTab, count: failed.length },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FB]">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {completed.length} payments recorded · ${totalAllTime.toLocaleString()} all time
          </p>
        </div>
        <Button onClick={() => setRecordOpen(true)}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg gap-1.5 px-4">
          <Plus className="h-3.5 w-3.5" /> Record Payment
        </Button>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">This Month</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${thisMonthTotal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {lastMonthTotal > 0 && (
              <span className={thisMonthTotal >= lastMonthTotal ? 'text-emerald-600' : 'text-amber-600'}>
                {thisMonthTotal >= lastMonthTotal ? '↑' : '↓'} vs ${lastMonthTotal.toLocaleString()} last month
              </span>
            )}
            {lastMonthTotal === 0 && `${completed.filter(p => p.payment_date?.startsWith(thisMonth)).length} payments`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">All Time Collected</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalAllTime.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{completed.length} completed payments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${pendingTotal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{pending.length} awaiting confirmation</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Failed</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{failed.length}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {failed.length > 0 ? 'need attention' : 'none this month'}
          </p>
        </div>
      </div>

      {/* ── METHOD BREAKDOWN (only shown if there are payments this month) ── */}
      {methodBreakdown.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {format(now, 'MMMM yyyy')} — Payment Methods
            </p>
            <div className="flex items-center gap-6">
              {methodBreakdown.map(m => (
                <div key={m.method} className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-700">{m.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{m.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${thisMonthTotal > 0 ? (m.amount / thisMonthTotal) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">${m.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER TABS + SEARCH + MONTH PICKER ── */}
      <div className="px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => { setFilter(tab.value); setSelectedMonth('all') }}
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
        <div className="flex items-center gap-2 pb-1">
          {/* Month filter */}
          {allMonths.length > 1 && (
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setFilter('all') }}
              className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="all">All months</option>
              {allMonths.map(m => (
                <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input placeholder="Search payments..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-xs bg-white border-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* ── PAYMENTS TABLE ── */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-14">
              <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No payments found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or record a new payment</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Tenant', 'Unit · Building', 'Amount', 'For Month', 'Date Paid', 'Method', 'Reference', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(p => {
                  // Determine which month this payment covers
                  const forMonth = p.payment_date ? format(new Date(p.payment_date), 'MMM yyyy') : '—'
                  // Check if amount differs from expected rent
                  const amountDiff = Number(p.amount) - p.lease_rent_amount
                  const isPartial = amountDiff < 0 && p.lease_rent_amount > 0
                  const isOverpaid = amountDiff > 0 && p.lease_rent_amount > 0

                  return (
                    <tr key={p.id}
                      onClick={() => {
                        // find the lease for this payment and navigate
                        const leaseId = p.lease_id
                        if (leaseId) router.push(`/leases/${leaseId}`)
                      }}
                      className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer">

                      {/* Tenant — with avatar, name, phone */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 border border-gray-100">
                            {p.tenant_photo
                              ? <img src={p.tenant_photo} alt={p.tenant_name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">{p.tenant_initials}</div>}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.tenant_name}</p>
                            <p className="text-[11px] text-gray-400">{p.tenant_phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Unit + building */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-800">{p.unit_code}</p>
                        <p className="text-[11px] text-gray-400">{p.building_name}</p>
                      </td>

                      {/* Amount — with partial/overpaid indicator */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-gray-900">${Number(p.amount).toLocaleString()}</p>
                        {isPartial && (
                          <p className="text-[10px] text-amber-600 font-semibold">
                            Partial · ${Math.abs(amountDiff).toLocaleString()} short
                          </p>
                        )}
                        {isOverpaid && (
                          <p className="text-[10px] text-blue-600 font-semibold">
                            +${amountDiff.toLocaleString()} over
                          </p>
                        )}
                      </td>

                      {/* For month */}
                      <td className="px-4 py-3.5 text-xs text-gray-500 font-medium">{forMonth}</td>

                      {/* Date paid */}
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {format(new Date(p.payment_date), 'MMM d, yyyy')}
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {METHOD_LABEL[p.method ?? ''] ?? p.method ?? '—'}
                        </span>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">
                        {p.reference ?? '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {p.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                        {p.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                            <X className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50">
                  <td className="px-5 py-2.5" colSpan={2}>
                    <span className="text-xs text-gray-500">
                      Showing <span className="font-semibold text-gray-700">{displayed.length}</span> of {payments.length} payments
                    </span>
                  </td>
                  <td className="px-4 py-2.5" colSpan={2}>
                    <span className="text-xs font-semibold text-emerald-600">
                      ${displayed.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0).toLocaleString()} in view
                    </span>
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <RecordPaymentDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSaved={() => { setRecordOpen(false); load() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}
