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
  ArrowLeft, Search, CheckCircle2, AlertCircle, Clock,
  CreditCard, Plus, Building2, ArrowUpRight, Receipt
} from 'lucide-react'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { format } from 'date-fns'
import { usePropertyType } from '@/hooks/usePropertyType'

type FilterTab = 'all' | 'paid' | 'unpaid'

export default function RentTrackerPage() {
  const { orgId, getToken } = useAuth()
  const router    = useRouter()
  const { propertyType } = usePropertyType() // renamed from 'type'

  const isCommercial = propertyType === 'commercial'

  const [leases,          setLeases]          = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [filter,          setFilter]          = useState<FilterTab>('all')
  const [search,          setSearch]          = useState('')
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | undefined>()
  const [paymentOpen,     setPaymentOpen]     = useState(false)

  useEffect(() => { if (orgId) load() }, [orgId, propertyType])

  async function load() {
    setLoading(true)
    const token = await getToken({ template: 'supabase' });
    const supabase = getSupabaseBrowserClient(token ?? undefined);
    const { data } = await supabase
      .from('leases')
      .select(`*, tenants(id, first_name, last_name, primary_phone, photo_url, tenant_type, company_name),
        units(id, unit_code, buildings(id, name, building_type)),
        rent_payments(id, amount, payment_date, status, method)`)
      .eq('organization_id', orgId!)
      .eq('status', 'active')
      .order('lease_start', { ascending: false })

    let result = data ?? []

    // For commercial mode, filter to residential only if needed
    if (isCommercial) {
      // Commercial users don't use rent tracker — show redirect notice below
    }

    setLeases(result)
    setLoading(false)
  }

  const thisMonth    = format(new Date(), 'yyyy-MM')
  const totalExpected = leases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const totalCollected = leases.reduce((s, l) => {
    return s + (l.rent_payments ?? [])
      .filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
      .reduce((ss: number, p: any) => ss + Number(p.amount), 0)
  }, 0)
  const collectionRate = totalExpected > 0
    ? Math.round((totalCollected / totalExpected) * 100) : 0

  function getStatus(lease: any): 'paid' | 'partial' | 'unpaid' {
    const pays = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
    if (pays.length === 0) return 'unpaid'
    const amt = pays.reduce((s: number, p: any) => s + Number(p.amount), 0)
    return amt >= Number(lease.rent_amount) ? 'paid' : 'partial'
  }

  const enriched  = leases.map(l => ({ ...l, _status: getStatus(l) }))
  const paidCount = enriched.filter(l => l._status === 'paid').length
  const unpaidCount = enriched.filter(l => l._status !== 'paid').length

  const filtered = enriched.filter(l => {
    const q  = search.toLowerCase()
    const t  = l.tenants
    const isC = t?.tenant_type === 'company'
    const name = isC ? (t?.company_name ?? '').toLowerCase() : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    if (q && !name.includes(q) && !(l.units?.unit_code ?? '').toLowerCase().includes(q)) return false
    if (filter === 'paid')   return l._status === 'paid'
    if (filter === 'unpaid') return l._status === 'unpaid' || l._status === 'partial'
    return true
  })

  // Commercial users — show redirect notice
  if (isCommercial) return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 max-w-md text-center">
        <div className="w-12 h-12 bg-[#1B3B6F]/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Receipt className="h-6 w-6 text-[#1B3B6F]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Rent Tracker is for Residential</h2>
        <p className="text-sm text-slate-500 mb-5">
          Commercial tenants are billed via invoices with service charges included. Use the Invoices section to track payments.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push('/invoices')}
            className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm rounded-xl font-semibold shadow-sm">
            Go to Invoices
          </Button>
          <Button variant="outline" onClick={() => router.push('/leases')}
            className="h-9 text-sm rounded-xl border-slate-200">
            Back to Leases
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="px-6 pt-5 pb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leases')}
            className="p-1 rounded-lg hover:bg-slate-200 transition-colors text-slate-400">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Track & Manage Rent</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(), 'MMMM yyyy')} · {leases.length} active leases
            </p>
          </div>
        </div>
        <Button onClick={() => { setSelectedLeaseId(undefined); setPaymentOpen(true) }}
          className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl gap-1.5 px-4 shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Record Payment
        </Button>
      </motion.div>

      {/* Collection summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }}
        className="px-6 mb-5"
      >
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {format(new Date(), 'MMMM yyyy')} — Rent Collection
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {paidCount} of {leases.length} tenants paid · ${totalCollected.toLocaleString()} of ${totalExpected.toLocaleString()} collected
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold tabular-nums ${collectionRate >= 90 ? 'text-teal-600' : collectionRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {collectionRate}%
              </p>
              <p className="text-xs text-slate-400">collection rate</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${collectionRate}%` }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${collectionRate >= 90 ? 'bg-gradient-to-r from-teal-500 to-teal-400' : collectionRate >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-300' : 'bg-gradient-to-r from-red-400 to-red-300'}`}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-teal-600 font-semibold">${totalCollected.toLocaleString()} collected</span>
            <span className="text-xs text-amber-600 font-semibold">${(totalExpected - totalCollected).toLocaleString()} outstanding</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs + search */}
      <div className="px-6 flex items-center justify-between">
        <div className="flex items-center gap-0.5 border-b border-slate-200">
          {[
            { label: 'All', value: 'all' as FilterTab, count: leases.length },
            { label: 'Paid', value: 'paid' as FilterTab, count: paidCount },
            { label: 'Unpaid', value: 'unpaid' as FilterTab, count: unpaidCount },
          ].map(tab => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === tab.value ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="Search tenant or unit…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 w-52 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400/25" />
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">No results</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Tenant', 'Unit', 'Monthly Rent', 'This Month', 'Last Payment', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                  </tr>
              </thead>
              <tbody>
                {filtered.map((lease, i) => {
                  const t    = lease.tenants
                  const u    = lease.units
                  const isC  = t?.tenant_type === 'company'
                  const name = isC ? (t?.company_name ?? '—') : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const init = isC ? (t?.company_name ?? 'C')[0].toUpperCase() : `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                  const thisMonthPays = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
                  const thisMonthAmt  = thisMonthPays.reduce((s: number, p: any) => s + Number(p.amount), 0)
                  const allPays = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed')
                    .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                  const lastPay = allPays[0]
                  const st = lease._status

                  return (
                    <motion.tr
                      key={lease.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.25 }}
                      className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer group ${st === 'unpaid' ? 'bg-amber-50/25' : ''}`}
                      onClick={() => router.push(`/leases/${lease.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#14b8a6] border border-[#1B3B6F]/20">
                            {t?.photo_url
                              ? <img src={t.photo_url} alt={name} className="w-full h-full object-cover" />
                              : init}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{name}</p>
                            <p className="text-[11px] text-slate-400">{t?.primary_phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800 font-mono">{u?.unit_code}</p>
                        <p className="text-[11px] text-slate-400">{u?.buildings?.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">${Number(lease.rent_amount).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {thisMonthAmt > 0
                          ? <span className="text-sm font-bold text-teal-600 tabular-nums">${thisMonthAmt.toLocaleString()}</span>
                          : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {lastPay ? format(new Date(lastPay.payment_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {st === 'paid' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        )}
                        {st === 'partial' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20">
                            <Clock className="h-3 w-3" /> Partial
                          </span>
                        )}
                        {st === 'unpaid' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3" /> Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {st !== 'paid' && (
                          <button
                            onClick={() => { setSelectedLeaseId(lease.id); setPaymentOpen(true) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline"
                          >
                            <CreditCard className="h-3 w-3" /> Record
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50/50">
                  <td colSpan={3} className="px-5 py-2.5">
                    <span className="text-xs text-slate-500">
                      <span className="font-bold text-slate-700">{paidCount}</span> paid ·{' '}
                      <span className="font-bold text-amber-600">{unpaidCount}</span> unpaid ·{' '}
                      <span className="font-bold text-slate-700">{leases.length}</span> total
                    </span>
                  </td>
                  <td colSpan={4} className="px-4 py-2.5 text-right">
                    <span className="text-xs text-slate-400">
                      Expected: <span className="font-bold text-slate-700">${totalExpected.toLocaleString()}</span> ·{' '}
                      Collected: <span className="font-bold text-teal-600">${totalCollected.toLocaleString()}</span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSaved={() => { setPaymentOpen(false); load() }}
        organizationId={orgId ?? ''}
        preselectedLeaseId={selectedLeaseId}
      />
    </div>
  )
}

