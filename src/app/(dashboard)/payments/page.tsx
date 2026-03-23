'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, CheckCircle2, Clock, X,
  CreditCard, DollarSign, Home, Building2, ArrowUpRight
} from 'lucide-react'
import { format, subMonths } from 'date-fns'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { usePropertyType } from '@/hooks/usePropertyType'

type FilterTab  = 'all' | 'completed' | 'pending' | 'failed'
type Portfolio  = 'all' | 'residential' | 'commercial'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  status: string
  lease_id: string
  tenant_name: string
  tenant_initials: string
  tenant_photo: string | null
  tenant_phone: string | null
  unit_code: string
  building_name: string
  building_type: string | null
  lease_rent_amount: number
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money', cheque: 'Cheque', other: 'Other',
}

function PortfolioTag({ buildingType }: { buildingType?: string | null }) {
  const isCommercial = buildingType === 'commercial'
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
      isCommercial
        ? 'bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20'
        : 'bg-teal-50 text-teal-700 border border-teal-200'
    }`}>
      {isCommercial ? <Building2 className="h-2.5 w-2.5" /> : <Home className="h-2.5 w-2.5" />}
      {isCommercial ? 'Commercial' : 'Residential'}
    </span>
  )
}

export default function PaymentsPage() {
  const { orgId } = useAuth()
  const router    = useRouter()
  const supabase  = getSupabaseBrowserClient()
  const { type }  = usePropertyType()

  const isMixed      = type === 'mixed'
  const isCommercial = type === 'commercial'
  const showPortfolioFilter = isMixed || isCommercial

  const [payments,       setPayments]       = useState<Payment[]>([])
  const [loading,        setLoading]        = useState(true)
  const [filter,         setFilter]         = useState<FilterTab>('all')
  const [search,         setSearch]         = useState('')
  const [recordOpen,     setRecordOpen]     = useState(false)
  const [selectedMonth,  setSelectedMonth]  = useState('all')
  const [portfolioFilter, setPortfolioFilter] = useState<Portfolio>('all')

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const { data: leaseRows } = await supabase
      .from('leases')
      .select(`id, rent_amount,
        tenants(first_name, last_name, photo_url, primary_phone, tenant_type, company_name),
        units(unit_code, buildings(name, building_type))`)
      .eq('organization_id', orgId!)

    if (!leaseRows || leaseRows.length === 0) { setPayments([]); setLoading(false); return }

    const leaseMap = Object.fromEntries((leaseRows as any[]).map(l => [l.id, l]))
    const leaseIds = (leaseRows as any[]).map(l => l.id)

    const { data: payRows } = await supabase
      .from('rent_payments')
      .select('id, amount, payment_date, method, reference, status, lease_id')
      .in('lease_id', leaseIds)
      .order('payment_date', { ascending: false })

    const enriched: Payment[] = ((payRows ?? []) as any[]).map(p => {
      const lease = leaseMap[p.lease_id] as any
      const t     = lease?.tenants
      const u     = lease?.units
      const isC   = t?.tenant_type === 'company'
      const firstName = t?.first_name ?? ''
      const lastName  = t?.last_name ?? ''
      const name = isC
        ? (t?.company_name ?? `${firstName} ${lastName}`.trim())
        : `${firstName} ${lastName}`.trim()
      const initials = isC
        ? (t?.company_name ?? 'C')[0].toUpperCase()
        : `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()

      return {
        ...p,
        tenant_name: name || 'Unknown',
        tenant_initials: initials || '?',
        tenant_photo: t?.photo_url ?? null,
        tenant_phone: t?.primary_phone ?? null,
        unit_code: u?.unit_code ?? '—',
        building_name: u?.buildings?.name ?? '—',
        building_type: u?.buildings?.building_type ?? null,
        lease_rent_amount: Number(lease?.rent_amount ?? 0),
      }
    })

    setPayments(enriched)
    setLoading(false)
  }

  const now       = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const completed = payments.filter(p => p.status === 'completed')
  const pending   = payments.filter(p => p.status === 'pending')
  const failed    = payments.filter(p => p.status === 'failed')

  const totalAllTime    = completed.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonthTotal  = completed.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const lastMonthTotal  = completed.filter(p => p.payment_date?.startsWith(lastMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const pendingTotal    = pending.reduce((s, p) => s + Number(p.amount), 0)

  // Portfolio split for mixed
  const residentialTotal = completed.filter(p => p.payment_date?.startsWith(thisMonth) && p.building_type !== 'commercial').reduce((s, p) => s + Number(p.amount), 0)
  const commercialTotal  = completed.filter(p => p.payment_date?.startsWith(thisMonth) && p.building_type === 'commercial').reduce((s, p) => s + Number(p.amount), 0)

  const methodBreakdown = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
    .map(m => ({
      method: m,
      count:  completed.filter(p => (p.method ?? 'other') === m && p.payment_date?.startsWith(thisMonth)).length,
      amount: completed.filter(p => (p.method ?? 'other') === m && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0),
    }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.amount - a.amount)

  const allMonths = Array.from(new Set(payments.map(p => p.payment_date?.substring(0, 7)).filter(Boolean)))
    .sort((a, b) => (b as string).localeCompare(a as string)).slice(0, 12) as string[]

  const displayed = payments.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.tenant_name.toLowerCase().includes(q) ||
      p.unit_code.toLowerCase().includes(q) || p.building_name.toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'completed') return p.status === 'completed'
    if (filter === 'pending')   return p.status === 'pending'
    if (filter === 'failed')    return p.status === 'failed'
    if (selectedMonth !== 'all') return p.payment_date?.startsWith(selectedMonth)
    const matchPortfolio =
      portfolioFilter === 'all' ? true :
      portfolioFilter === 'commercial' ? p.building_type === 'commercial' :
      p.building_type !== 'commercial'
    return matchPortfolio
  })

  const tabs = [
    { label: 'All',       value: 'all' as FilterTab,       count: payments.length },
    { label: 'Completed', value: 'completed' as FilterTab, count: completed.length },
    { label: 'Pending',   value: 'pending' as FilterTab,   count: pending.length },
    { label: 'Failed',    value: 'failed' as FilterTab,    count: failed.length },
  ]

  return (
    <div className="min-h-screen bg-slate-50/70">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="px-6 pt-6 pb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {completed.length} payments recorded · ${totalAllTime.toLocaleString()} all time
            {(isMixed || isCommercial) && (
              <span className="ml-2 text-[#1B3B6F] font-medium">· Mixed portfolio</span>
            )}
          </p>
        </div>
        <Button onClick={() => setRecordOpen(true)}
          className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl gap-1.5 px-4 shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Record Payment
        </Button>
      </motion.div>

      {/* Stat cards */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          {
            label: 'This Month', value: `$${thisMonthTotal.toLocaleString()}`,
            sub: lastMonthTotal > 0
              ? `${thisMonthTotal >= lastMonthTotal ? '↑' : '↓'} vs $${lastMonthTotal.toLocaleString()} last month`
              : `${completed.filter(p => p.payment_date?.startsWith(thisMonth)).length} payments`,
            valueColor: 'text-teal-600',
            subColor: thisMonthTotal >= lastMonthTotal ? 'text-teal-600' : 'text-amber-600',
            accentFrom: 'from-teal-500/5',
            icon: DollarSign, iconBg: 'bg-teal-500/10', iconColor: 'text-teal-600',
          },
          {
            label: 'All Time Collected', value: `$${totalAllTime.toLocaleString()}`,
            sub: `${completed.length} completed payments`,
            valueColor: 'text-slate-900', subColor: 'text-slate-400',
            accentFrom: 'from-[#1B3B6F]/6',
            icon: CheckCircle2, iconBg: 'bg-[#1B3B6F]', iconColor: 'text-[#14b8a6]',
          },
          {
            label: 'Pending', value: `$${pendingTotal.toLocaleString()}`,
            sub: `${pending.length} awaiting confirmation`,
            valueColor: 'text-amber-600', subColor: 'text-slate-400',
            accentFrom: 'from-amber-500/5',
            icon: Clock, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600',
          },
          {
            label: 'Failed', value: String(failed.length),
            sub: failed.length > 0 ? 'need attention' : 'none this period',
            valueColor: failed.length > 0 ? 'text-red-500' : 'text-slate-400',
            subColor: 'text-slate-400',
            accentFrom: failed.length > 0 ? 'from-red-500/5' : 'from-slate-200/20',
            icon: X, iconBg: failed.length > 0 ? 'bg-red-500/10' : 'bg-slate-100',
            iconColor: failed.length > 0 ? 'text-red-500' : 'text-slate-400',
          },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm px-4 py-3.5 overflow-hidden"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${s.accentFrom} to-transparent pointer-events-none`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${s.valueColor}`}>{s.value}</p>
                <p className={`text-[11px] mt-0.5 ${s.subColor}`}>{s.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${s.iconBg} shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Portfolio split (mixed only) */}
      {isMixed && (
        <div className="px-6 grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-teal-200/80 rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Home className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Residential this month</p>
                <p className="text-lg font-bold text-teal-700 tabular-nums">${residentialTotal.toLocaleString()}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">🏠 Residential</span>
          </div>
          <div className="bg-white border border-[#1B3B6F]/20 rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1B3B6F]/8 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-[#1B3B6F]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Commercial this month</p>
                <p className="text-lg font-bold text-[#1B3B6F] tabular-nums">${commercialTotal.toLocaleString()}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20">🏢 Commercial</span>
          </div>
        </div>
      )}

      {/* Method breakdown */}
      {methodBreakdown.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              {format(now, 'MMMM yyyy')} — Payment Methods
            </p>
            <div className="flex items-center gap-6">
              {methodBreakdown.map(m => (
                <div key={m.method} className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">{METHOD_LABEL[m.method] ?? m.method}</span>
                    <span className="text-xs font-bold text-slate-900">{m.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${thisMonthTotal > 0 ? (m.amount / thisMonthTotal) * 100 : 0}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-teal-600 font-bold mt-1 tabular-nums">${m.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs + filters */}
      <div className="px-6 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-0.5">
          {tabs.map(tab => (
            <button key={tab.value} onClick={() => { setFilter(tab.value); setSelectedMonth('all') }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          {/* Portfolio filter */}
          {showPortfolioFilter && (
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
              {([
                { value: 'all' as Portfolio, label: 'All' },
                { value: 'residential' as Portfolio, label: '🏠' },
                { value: 'commercial' as Portfolio, label: '🏢' },
              ]).map(opt => (
                <button key={opt.value} onClick={() => setPortfolioFilter(opt.value)}
                  title={opt.value === 'residential' ? 'Residential' : opt.value === 'commercial' ? 'Commercial' : 'All portfolios'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    portfolioFilter === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {/* Month filter */}
          {allMonths.length > 1 && (
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setFilter('all') }}
              className="h-8 px-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-400/25">
              <option value="all">All months</option>
              {allMonths.map(m => (
                <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>
              ))}
            </select>
          )}
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search payments…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 w-48 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400/25" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No payments found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or record a new payment</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Tenant', 'Unit · Building', 'Type', 'Amount', 'For Month', 'Date Paid', 'Method', 'Reference', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((p, i) => {
                  const diff       = Number(p.amount) - p.lease_rent_amount
                  const isPartial  = diff < 0 && p.lease_rent_amount > 0
                  const isOverpaid = diff > 0 && p.lease_rent_amount > 0

                  return (
                    <motion.tr key={p.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => router.push(`/leases/${p.lease_id}`)}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    >
                      {/* Tenant */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0 overflow-hidden">
                            {p.tenant_photo
                              ? <img src={p.tenant_photo} alt={p.tenant_name} className="w-full h-full object-cover" />
                              : p.tenant_initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{p.tenant_name}</p>
                            <p className="text-[11px] text-slate-400">{p.tenant_phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      {/* Unit */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800 font-mono">{p.unit_code}</p>
                        <p className="text-[11px] text-slate-400">{p.building_name}</p>
                      </td>
                      {/* Portfolio tag */}
                      <td className="px-4 py-3.5">
                        <PortfolioTag buildingType={p.building_type} />
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">${Number(p.amount).toLocaleString()}</p>
                        {isPartial  && <p className="text-[10px] text-amber-600 font-semibold">Partial · ${Math.abs(diff).toLocaleString()} short</p>}
                        {isOverpaid && <p className="text-[10px] text-teal-600 font-semibold">+${diff.toLocaleString()} over</p>}
                      </td>
                      {/* For month */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                        {p.payment_date ? format(new Date(p.payment_date), 'MMM yyyy') : '—'}
                      </td>
                      {/* Date paid */}
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {format(new Date(p.payment_date), 'MMM d, yyyy')}
                      </td>
                      {/* Method */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                          {METHOD_LABEL[p.method ?? ''] ?? p.method ?? '—'}
                        </span>
                      </td>
                      {/* Reference */}
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{p.reference ?? '—'}</td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {p.status === 'completed' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                          </span>
                        )}
                        {p.status === 'failed' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                            <X className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50/50">
                  <td className="px-5 py-2.5" colSpan={3}>
                    <span className="text-xs text-slate-500">
                      Showing <span className="font-bold text-slate-700">{displayed.length}</span> of {payments.length} payments
                    </span>
                  </td>
                  <td className="px-4 py-2.5" colSpan={6}>
                    <span className="text-xs font-bold text-teal-600">
                      ${displayed.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0).toLocaleString()} in view
                    </span>
                  </td>
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
