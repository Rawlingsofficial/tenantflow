'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, DollarSign, TrendingUp,
  AlertCircle, CheckCircle2, Clock, X,
  ChevronDown, Filter, Download
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'

type FilterTab = 'all' | 'completed' | 'pending' | 'failed'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  status: string
  lease_id: string
  lease?: {
    id: string
    rent_amount: number
    tenant_id: string
    unit_id: string
    tenants?: { first_name: string | null; last_name: string | null; photo_url: string | null; primary_phone: string | null }
    units?: { unit_code: string; buildings?: { name: string } | null }
  }
}

export default function PaymentsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)

  useEffect(() => { if (orgId) loadPayments() }, [orgId])

  async function loadPayments() {
    setLoading(true)
    const { data } = await supabase
      .from('rent_payments')
      .select(`
        *,
        leases(
          id, rent_amount, tenant_id, unit_id,
          tenants(first_name, last_name, photo_url, primary_phone),
          units(unit_code, buildings(name))
        )
      `)
      .order('payment_date', { ascending: false })

    // Filter to org's payments via lease join
    const orgLeases = await supabase
      .from('leases')
      .select('id')
      .eq('organization_id', orgId!)
    const leaseIds = new Set((orgLeases.data ?? []).map((l: any) => l.id))
    const filtered = (data ?? []).filter((p: any) => leaseIds.has(p.lease_id))
    setPayments(filtered as Payment[])
    setLoading(false)
  }

  // Stats
  const completed = payments.filter(p => p.status === 'completed')
  const pending = payments.filter(p => p.status === 'pending')
  const totalCollected = completed.reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.amount), 0)

  // This month
  const thisMonth = format(new Date(), 'yyyy-MM')
  const thisMonthPayments = completed.filter(p => p.payment_date?.startsWith(thisMonth))
  const thisMonthTotal = thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0)

  // Last 6 months for mini chart
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(new Date(), 5 - i)
    const ms = format(m, 'yyyy-MM')
    const val = completed
      .filter(p => p.payment_date?.startsWith(ms))
      .reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), value: val }
  })
  const maxBar = Math.max(...last6.map(m => m.value), 1)

  const displayed = payments.filter(p => {
    const q = search.toLowerCase()
    const t = p.lease?.tenants
    const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    const unit = p.lease?.units?.unit_code?.toLowerCase() ?? ''
    const bldg = p.lease?.units?.buildings?.name?.toLowerCase() ?? ''
    const matchSearch = !q || name.includes(q) || unit.includes(q) || bldg.includes(q) ||
      p.reference?.toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'completed') return p.status === 'completed'
    if (filter === 'pending') return p.status === 'pending'
    if (filter === 'failed') return p.status === 'failed'
    return true
  })

  const methodLabel: Record<string, string> = {
    cash: 'Cash', bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money', cheque: 'Cheque', other: 'Other',
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Payments</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ${thisMonthTotal.toLocaleString()} collected this month
          </p>
        </div>
        <Button onClick={() => setRecordOpen(true)}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 px-4">
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Collected', value: `$${totalCollected.toLocaleString()}`, color: 'text-emerald-600', sub: `${completed.length} payments` },
          { label: 'This Month', value: `$${thisMonthTotal.toLocaleString()}`, color: 'text-emerald-600', sub: `${thisMonthPayments.length} transactions` },
          { label: 'Pending', value: `$${totalPending.toLocaleString()}`, color: 'text-amber-600', sub: `${pending.length} awaiting` },
          { label: 'Failed', value: payments.filter(p => p.status === 'failed').length.toString(), color: 'text-red-500', sub: 'need attention' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Mini revenue chart */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Revenue Collected</p>
              <p className="text-xs text-gray-400">Last 6 months</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600">${totalCollected.toLocaleString()}</p>
              <p className="text-xs text-gray-400">all time</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-16">
            {last6.map((m, i) => {
              const h = maxBar > 0 ? (m.value / maxBar) * 100 : 8
              const isCurrent = i === last6.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg"
                    style={{
                      height: `${Math.max(h, 8)}%`,
                      background: isCurrent
                        ? 'linear-gradient(to top, #059669, #34d399)'
                        : 'linear-gradient(to top, #a7f3d0, #d1fae5)',
                      minHeight: '6px'
                    }} />
                  <p className="text-[10px] text-gray-400">{m.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          {([
            { label: 'All', value: 'all' as FilterTab, count: payments.length },
            { label: 'Completed', value: 'completed' as FilterTab, count: completed.length },
            { label: 'Pending', value: 'pending' as FilterTab, count: pending.length },
            { label: 'Failed', value: 'failed' as FilterTab },
          ]).map((tab, i) => (
            <button key={i} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search payments..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="px-6 mt-0 mb-8">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No payments found</p>
              <p className="text-xs text-gray-400 mt-1">Record a payment to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Tenant', 'Unit', 'Amount', 'Date', 'Method', 'Reference', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(p => {
                  const t = p.lease?.tenants
                  const fullName = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const initials = `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 border border-gray-100">
                            {t?.photo_url
                              ? <img src={t.photo_url} alt={fullName} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">{initials || '?'}</div>}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{fullName || '—'}</p>
                            <p className="text-[11px] text-gray-400">{t?.primary_phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-800">{p.lease?.units?.unit_code ?? '—'}</p>
                        <p className="text-[11px] text-gray-400">{p.lease?.units?.buildings?.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-gray-900">${Number(p.amount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {format(new Date(p.payment_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {methodLabel[p.method ?? ''] ?? p.method ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{p.reference ?? '—'}</td>
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
            </table>
          )}
        </div>
      </div>

      <RecordPaymentDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSaved={() => { setRecordOpen(false); loadPayments() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}
