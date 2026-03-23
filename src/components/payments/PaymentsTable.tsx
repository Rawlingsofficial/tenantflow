'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, CheckCircle2, Download, CreditCard, Smartphone,
  Building2, FileCheck, HelpCircle, X, Home, ArrowUpRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { RentPayment } from '@/types'

interface PaymentWithLease extends RentPayment {
  building_type?: string | null
  leases: {
    id: string
    rent_amount: number
    lease_start: string
    tenants: { first_name: string | null; last_name: string | null; primary_phone: string | null } | null
    units: { unit_code: string; buildings: { name: string; building_type?: string | null } | null } | null
  } | null
}

interface UnpaidLease {
  id: string
  rent_amount: number
  lease_start: string
  building_type?: string | null
  tenants: { first_name: string | null; last_name: string | null; primary_phone: string | null } | null
  units: { unit_code: string; buildings: { name: string; building_type?: string | null } | null } | null
  paidThisMonth: number
}

interface Props {
  payments: PaymentWithLease[]
  unpaidLeases: UnpaidLease[]
  onRecordPayment: () => void
  onRecordPaymentForLease: (leaseId: string) => void
  showPortfolioFilter?: boolean  // only shown for mixed/commercial orgs
}

type Tab      = 'all' | 'unpaid'
type Portfolio = 'all' | 'residential' | 'commercial'

const METHOD_ICONS: Record<string, any> = {
  cash: CreditCard, bank_transfer: Building2,
  mobile_money: Smartphone, cheque: FileCheck, other: HelpCircle,
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

function exportToCSV(payments: PaymentWithLease[]) {
  const headers = ['Date', 'Tenant', 'Unit', 'Building', 'Type', 'Amount', 'Method', 'Reference', 'Status']
  const rows = payments.map(p => {
    const name = `${p.leases?.tenants?.first_name ?? ''} ${p.leases?.tenants?.last_name ?? ''}`.trim()
    const bt = p.leases?.units?.buildings?.building_type ?? p.building_type ?? ''
    return [
      format(new Date(p.payment_date), 'dd MMM yyyy'),
      name,
      p.leases?.units?.unit_code ?? '',
      p.leases?.units?.buildings?.name ?? '',
      bt === 'commercial' ? 'Commercial' : 'Residential',
      p.amount, p.method ?? '', p.reference ?? '', p.status,
    ]
  })
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `payments_${format(new Date(), 'yyyy_MM_dd')}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function PaymentsTable({
  payments, unpaidLeases, onRecordPayment, onRecordPaymentForLease, showPortfolioFilter,
}: Props) {
  const [tab,             setTab]             = useState<Tab>('all')
  const [search,          setSearch]          = useState('')
  const [methodFilter,    setMethodFilter]    = useState('all')
  const [monthFilter,     setMonthFilter]     = useState('all')
  const [portfolioFilter, setPortfolioFilter] = useState<Portfolio>('all')

  const months = Array.from(new Set(payments.map(p => format(new Date(p.payment_date), 'yyyy-MM')))).sort((a, b) => b.localeCompare(a))

  // Helper to get building_type from a payment
  const getBT = (p: PaymentWithLease) => p.leases?.units?.buildings?.building_type ?? p.building_type

  const filtered = payments.filter(p => {
    const q    = search.toLowerCase()
    const name = `${p.leases?.tenants?.first_name ?? ''} ${p.leases?.tenants?.last_name ?? ''}`.toLowerCase()
    const unit = p.leases?.units?.unit_code?.toLowerCase() ?? ''
    const bldg = p.leases?.units?.buildings?.name?.toLowerCase() ?? ''
    const ref  = p.reference?.toLowerCase() ?? ''
    const matchSearch   = !q || name.includes(q) || unit.includes(q) || bldg.includes(q) || ref.includes(q)
    const matchMethod   = methodFilter === 'all' || p.method === methodFilter
    const matchMonth    = monthFilter === 'all' || p.payment_date.startsWith(monthFilter)
    const bt            = getBT(p)
    const matchPortfolio =
      portfolioFilter === 'all' ? true :
      portfolioFilter === 'commercial' ? bt === 'commercial' :
      bt !== 'commercial'
    return matchSearch && matchMethod && matchMonth && matchPortfolio
  })

  const filteredUnpaid = unpaidLeases.filter(l => {
    const q    = search.toLowerCase()
    const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.toLowerCase()
    const unit = l.units?.unit_code?.toLowerCase() ?? ''
    const bldg = l.units?.buildings?.name?.toLowerCase() ?? ''
    const matchSearch = !q || name.includes(q) || unit.includes(q) || bldg.includes(q)
    const bt   = l.units?.buildings?.building_type ?? l.building_type
    const matchPortfolio =
      portfolioFilter === 'all' ? true :
      portfolioFilter === 'commercial' ? bt === 'commercial' :
      bt !== 'commercial'
    return matchSearch && matchPortfolio
  })

  if (payments.length === 0 && unpaidLeases.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <CreditCard className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">No payments recorded yet</p>
        <Button className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm" onClick={onRecordPayment}>
          Record first payment
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Tabs ── */}
      <div className="flex gap-0.5 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { key: 'all' as Tab, label: `All payments (${payments.length})` },
          { key: 'unpaid' as Tab, label: 'Unpaid this month', count: unpaidLeases.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.count !== undefined && t.count > 0 && (
              <span className="h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{t.count}</span>
            )}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      {tab === 'all' && (
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search tenant, unit, reference…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25" />
          </div>

          {/* Portfolio filter — only for mixed/commercial */}
          {showPortfolioFilter && (
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
              {([
                { value: 'all' as Portfolio,         label: 'All' },
                { value: 'residential' as Portfolio,  label: '🏠 Residential' },
                { value: 'commercial' as Portfolio,   label: '🏢 Commercial' },
              ]).map(opt => (
                <button key={opt.value} onClick={() => setPortfolioFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    portfolioFilter === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Month */}
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-400/25">
            <option value="all">All months</option>
            {months.map(m => (
              <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>
            ))}
          </select>

          {/* Method */}
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
            className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-400/25">
            <option value="all">All methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>

          <Button variant="outline" onClick={() => exportToCSV(filtered)}
            className="h-9 text-xs rounded-xl border-slate-200 gap-1.5 px-3">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      )}

      {/* Unpaid filters */}
      {tab === 'unpaid' && (
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search tenant, unit…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-slate-200" />
          </div>
          {showPortfolioFilter && (
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
              {([
                { value: 'all' as Portfolio, label: 'All' },
                { value: 'residential' as Portfolio, label: '🏠 Residential' },
                { value: 'commercial' as Portfolio, label: '🏢 Commercial' },
              ]).map(opt => (
                <button key={opt.value} onClick={() => setPortfolioFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    portfolioFilter === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ALL PAYMENTS TABLE ── */}
      {tab === 'all' && (
        <>
          <p className="text-xs text-slate-400">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''} ·{' '}
            <span className="font-semibold text-slate-600">${filtered.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}</span> total
          </p>
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Tenant', 'Unit · Building', 'Type', 'Amount', 'Date', 'Method', 'Reference', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-slate-400 py-10 text-sm">No payments match your filters</td></tr>
                ) : filtered.map((p, i) => {
                  const tenantName = `${p.leases?.tenants?.first_name ?? ''} ${p.leases?.tenants?.last_name ?? ''}`.trim()
                  const initial    = tenantName[0]?.toUpperCase() ?? '?'
                  const MethodIcon = METHOD_ICONS[p.method ?? 'other'] ?? HelpCircle
                  const bt         = getBT(p)
                  const rent       = Number(p.leases?.rent_amount ?? 0)
                  const diff       = Number(p.amount) - rent
                  const isPartial  = diff < 0 && rent > 0
                  const isOverpaid = diff > 0 && rent > 0

                  return (
                    <motion.tr key={p.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Tenant */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{tenantName || '—'}</p>
                            <p className="text-[11px] text-slate-400">{p.leases?.tenants?.primary_phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      {/* Unit */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800 font-mono">{p.leases?.units?.unit_code ?? '—'}</p>
                        <p className="text-[11px] text-slate-400">{p.leases?.units?.buildings?.name ?? '—'}</p>
                      </td>
                      {/* Portfolio type tag */}
                      <td className="px-4 py-3.5">
                        <PortfolioTag buildingType={bt} />
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">${Number(p.amount).toLocaleString()}</p>
                        {isPartial  && <p className="text-[10px] text-amber-600 font-semibold">Partial · ${Math.abs(diff).toLocaleString()} short</p>}
                        {isOverpaid && <p className="text-[10px] text-teal-600 font-semibold">+${diff.toLocaleString()} over</p>}
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-600">{format(new Date(p.payment_date), 'MMM d, yyyy')}</p>
                        <p className="text-[11px] text-slate-400">{format(new Date(p.payment_date), 'MMMM yyyy')}</p>
                      </td>
                      {/* Method */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <MethodIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs text-slate-600 capitalize">{METHOD_LABEL[p.method ?? ''] ?? p.method ?? '—'}</span>
                        </div>
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
                      {/* Arrow */}
                      <td className="px-4 py-3.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50/50">
                  <td className="px-5 py-2.5" colSpan={3}>
                    <span className="text-xs text-slate-500">
                      Showing <span className="font-bold text-slate-700">{filtered.length}</span> of {payments.length} payments
                    </span>
                  </td>
                  <td className="px-4 py-2.5" colSpan={6}>
                    <span className="text-xs font-bold text-teal-600">
                      ${filtered.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0).toLocaleString()} in view
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* ── UNPAID THIS MONTH ── */}
      {tab === 'unpaid' && (
        <>
          <p className="text-xs text-slate-400">
            {filteredUnpaid.length} tenant{filteredUnpaid.length !== 1 ? 's' : ''} unpaid ·{' '}
            <span className="font-semibold text-red-500">
              ${filteredUnpaid.reduce((s, l) => s + Number(l.rent_amount) - l.paidThisMonth, 0).toLocaleString()}
            </span>{' '}outstanding
          </p>
          {filteredUnpaid.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-teal-500" />
              </div>
              <p className="text-sm font-semibold text-teal-600">All tenants have paid this month!</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Tenant', 'Unit · Building', 'Type', 'Phone', 'Expected', 'Paid so far', 'Outstanding', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUnpaid.map((lease, i) => {
                    const tenantName  = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
                    const initial     = tenantName[0]?.toUpperCase() ?? '?'
                    const outstanding = Number(lease.rent_amount) - lease.paidThisMonth
                    const bt          = lease.units?.buildings?.building_type ?? lease.building_type

                    return (
                      <motion.tr key={lease.id}
                        initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">{initial}</div>
                            <p className="text-sm font-semibold text-slate-900">{tenantName || '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-slate-800 font-mono">{lease.units?.unit_code ?? '—'}</p>
                          <p className="text-[11px] text-slate-400">{lease.units?.buildings?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3.5"><PortfolioTag buildingType={bt} /></td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{lease.tenants?.primary_phone ?? '—'}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-slate-700 tabular-nums">${Number(lease.rent_amount).toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          {lease.paidThisMonth > 0
                            ? <span className="text-sm text-amber-600 font-semibold tabular-nums">${lease.paidThisMonth.toLocaleString()}</span>
                            : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-red-600 tabular-nums">${outstanding.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Button size="sm"
                            className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onRecordPaymentForLease(lease.id)}>
                            <CreditCard className="h-3 w-3 mr-1" /> Record
                          </Button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}


