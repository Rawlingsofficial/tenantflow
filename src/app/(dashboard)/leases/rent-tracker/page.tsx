'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Search, CheckCircle2, AlertCircle, Clock, CreditCard, Plus } from 'lucide-react'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { format } from 'date-fns'

type FilterTab = 'all' | 'paid' | 'unpaid' | 'overdue'

export default function RentTrackerPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | undefined>()
  const [paymentOpen, setPaymentOpen] = useState(false)

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`*, tenants(id, first_name, last_name, primary_phone, photo_url),
        units(id, unit_code, buildings(name)),
        rent_payments(id, amount, payment_date, status, method)`)
      .eq('organization_id', orgId!)
      .eq('status', 'active')
      .order('lease_start', { ascending: false })
    setLeases(data ?? [])
    setLoading(false)
  }

  const thisMonth = format(new Date(), 'yyyy-MM')
  const totalExpected = leases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const collectionRate = totalExpected > 0 ? Math.round(
    leases.filter(l => (l.rent_payments ?? []).some((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth)))
      .reduce((s, l) => s + Number(l.rent_amount), 0) / totalExpected * 100
  ) : 0
  const totalCollected = leases.reduce((s, l) => {
    return s + (l.rent_payments ?? []).filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth)).reduce((ss: number, p: any) => ss + Number(p.amount), 0)
  }, 0)

  function getStatus(lease: any): 'paid' | 'partial' | 'unpaid' {
    const pays = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
    if (pays.length === 0) return 'unpaid'
    const paidAmt = pays.reduce((s: number, p: any) => s + Number(p.amount), 0)
    return paidAmt >= Number(lease.rent_amount) ? 'paid' : 'partial'
  }

  const enriched = leases.map(l => ({ ...l, _status: getStatus(l) }))

  const filtered = enriched.filter(l => {
    const q = search.toLowerCase()
    const t = l.tenants
    const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    if (q && !name.includes(q) && !l.units?.unit_code?.toLowerCase().includes(q)) return false
    if (filter === 'paid') return l._status === 'paid'
    if (filter === 'unpaid') return l._status === 'unpaid' || l._status === 'partial'
    return true
  })

  const paidCount = enriched.filter(l => l._status === 'paid').length
  const unpaidCount = enriched.filter(l => l._status !== 'paid').length

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leases')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Leases
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Track & Manage Rent</h1>
        </div>
        <Button onClick={() => { setSelectedLeaseId(undefined); setPaymentOpen(true) }}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg gap-1.5 px-4">
          <Plus className="h-3.5 w-3.5" /> Record Payment
        </Button>
      </div>

      {/* Summary */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {format(new Date(), 'MMMM yyyy')} — Rent Collection
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {paidCount} of {leases.length} tenants paid · ${totalCollected.toLocaleString()} of ${totalExpected.toLocaleString()} collected
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">{collectionRate}%</p>
              <p className="text-xs text-gray-400">collection rate</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
              style={{ width: `${collectionRate}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-emerald-600 font-medium">${totalCollected.toLocaleString()} collected</span>
            <span className="text-xs text-amber-600 font-medium">${(totalExpected - totalCollected).toLocaleString()} outstanding</span>
          </div>
        </div>
      </div>

      {/* Filter + search */}
      <div className="px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          {([
            { label: 'All', value: 'all' as FilterTab, count: leases.length },
            { label: 'Paid', value: 'paid' as FilterTab, count: paidCount },
            { label: 'Unpaid', value: 'unpaid' as FilterTab, count: unpaidCount },
          ]).map((tab, i) => (
            <button key={i} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === tab.value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search tenant or unit..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Tenant', 'Unit', 'Monthly Rent', 'This Month', 'Last Payment', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lease => {
                  const t = lease.tenants
                  const u = lease.units
                  const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const initials = `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                  const thisMonthPays = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
                  const thisMonthAmt = thisMonthPays.reduce((s: number, p: any) => s + Number(p.amount), 0)
                  const allPays = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed').sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                  const lastPay = allPays[0]
                  const st = lease._status

                  return (
                    <tr key={lease.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer group ${st === 'unpaid' ? 'bg-amber-50/20' : ''}`}
                      onClick={() => router.push(`/leases/${lease.id}`)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 border border-gray-100">
                            {t?.photo_url ? <img src={t.photo_url} alt={name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">{initials}</div>}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{name}</p>
                            <p className="text-[11px] text-gray-400">{t?.primary_phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-800">{u?.unit_code}</p>
                        <p className="text-[11px] text-gray-400">{u?.buildings?.name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-800">${Number(lease.rent_amount).toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        {thisMonthAmt > 0
                          ? <span className="text-sm font-semibold text-emerald-600">${thisMonthAmt.toLocaleString()}</span>
                          : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {lastPay ? format(new Date(lastPay.payment_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {st === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        )}
                        {st === 'partial' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="h-3 w-3" /> Partial
                          </span>
                        )}
                        {st === 'unpaid' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3" /> Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {st !== 'paid' && (
                          <button onClick={() => { setSelectedLeaseId(lease.id); setPaymentOpen(true) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                            <CreditCard className="h-3 w-3" /> Record
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50">
                  <td colSpan={3} className="px-5 py-2.5">
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{paidCount}</span> paid ·{' '}
                      <span className="font-semibold text-amber-600">{unpaidCount}</span> unpaid ·{' '}
                      <span className="font-semibold text-gray-700">{leases.length}</span> total active leases
                    </span>
                  </td>
                  <td colSpan={4} className="px-4 py-2.5 text-right">
                    <span className="text-xs text-gray-500">
                      Expected: <span className="font-semibold text-gray-700">${totalExpected.toLocaleString()}</span> ·
                      Collected: <span className="font-semibold text-emerald-600">${totalCollected.toLocaleString()}</span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <RecordPaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)}
        onSaved={() => { setPaymentOpen(false); load() }}
        organizationId={orgId ?? ''} preselectedLeaseId={selectedLeaseId} />
    </div>
  )
}


