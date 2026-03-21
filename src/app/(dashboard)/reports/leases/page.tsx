'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format, subMonths, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function RevenueReport() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadPortfolioData(supabase, orgId).then(d => { setData(d); setLoading(false) })
  }, [orgId])

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  )
  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const activeLeases = data.leases.filter(l => l.status === 'active')
  const completed = data.payments.filter(p => p.status === 'completed')

  const expectedThisMonth = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const collectedThisMonth = completed.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const outstanding = Math.max(0, expectedThisMonth - collectedThisMonth)
  const collectionRate = expectedThisMonth > 0 ? Math.round((collectedThisMonth / expectedThisMonth) * 100) : 0
  const allTimeCollected = completed.reduce((s, p) => s + Number(p.amount), 0)

  // 12-month chart: collected vs expected
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const collected = completed.filter(p => p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    // expected = active leases at that time (approximate: use current active leases as proxy)
    const expected = expectedThisMonth
    return { label: format(m, 'MMM'), ms, collected, expected }
  })
  const maxVal = Math.max(...months12.map(m => Math.max(m.collected, m.expected)), 1)

  // By building
  const byBuilding = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bLeases = data.leases.filter(l => bUnits.some(u => u.id === l.unit_id))
    const bLeaseIds = bLeases.map(l => l.id)
    const bExpected = bLeases.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.rent_amount), 0)
    const bCollected = completed.filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
    const bAllTime = completed.filter(p => bLeaseIds.includes(p.lease_id)).reduce((s, p) => s + Number(p.amount), 0)
    return { ...b, expected: bExpected, collected: bCollected, allTime: bAllTime, rate: bExpected > 0 ? Math.round((bCollected / bExpected) * 100) : 0 }
  }).sort((a, b) => b.allTime - a.allTime)

  // Payment method breakdown (all time)
  const methods = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
  const methodBreakdown = methods.map(m => ({
    method: m,
    label: m === 'bank_transfer' ? 'Bank Transfer' : m === 'mobile_money' ? 'Mobile Money' : m.charAt(0).toUpperCase() + m.slice(1),
    count: completed.filter(p => (p.method ?? 'other') === m).length,
    amount: completed.filter(p => (p.method ?? 'other') === m).reduce((s, p) => s + Number(p.amount), 0),
  })).filter(m => m.count > 0).sort((a, b) => b.amount - a.amount)

  // Outstanding balances — active leases with no payment this month
  const outstandingLeases = activeLeases
    .map(l => {
      const pays = completed.filter(p => p.lease_id === l.id && p.payment_date?.startsWith(thisMonth))
      const paidAmt = pays.reduce((s, p) => s + Number(p.amount), 0)
      const owes = Number(l.rent_amount) - paidAmt
      return { ...l, paidAmt, owes }
    })
    .filter(l => l.owes > 0)
    .sort((a, b) => b.owes - a.owes)

  // Partial payments (paid but less than rent amount)
  const partialPayments = activeLeases
    .filter(l => {
      const pays = completed.filter(p => p.lease_id === l.id && p.payment_date?.startsWith(thisMonth))
      const paidAmt = pays.reduce((s, p) => s + Number(p.amount), 0)
      return paidAmt > 0 && paidAmt < Number(l.rent_amount)
    })
    .map(l => {
      const pays = completed.filter(p => p.lease_id === l.id && p.payment_date?.startsWith(thisMonth))
      const paidAmt = pays.reduce((s, p) => s + Number(p.amount), 0)
      const t = (l as any).tenants
      const u = (l as any).units
      return {
        name: `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim(),
        unit: u?.unit_code ?? '—',
        building: u?.buildings?.name ?? '—',
        expected: Number(l.rent_amount),
        paid: paidAmt,
        short: Number(l.rent_amount) - paidAmt,
      }
    })

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.push('/reports')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Reports
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">Revenue Report</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">{format(now, 'MMMM yyyy')}</span>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Expected This Month', value: `$${expectedThisMonth.toLocaleString()}`, sub: `${activeLeases.length} active leases`, color: 'text-gray-800' },
          { label: 'Collected This Month', value: `$${collectedThisMonth.toLocaleString()}`, sub: `${collectionRate}% collection rate`, color: 'text-emerald-600' },
          { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, sub: `${outstandingLeases.length} tenants owe`, color: outstanding > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'All Time Collected', value: `$${allTimeCollected.toLocaleString()}`, sub: `${completed.length} payments`, color: 'text-gray-800' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Collection rate progress */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Collection Rate — {format(now, 'MMMM yyyy')}</p>
            <span className={`text-lg font-bold ${collectionRate >= 90 ? 'text-emerald-600' : collectionRate >= 70 ? 'text-amber-600' : 'text-red-500'}`}>{collectionRate}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(collectionRate, 100)}%`,
                background: collectionRate >= 90 ? 'linear-gradient(to right, #059669, #34d399)' :
                  collectionRate >= 70 ? 'linear-gradient(to right, #d97706, #fbbf24)' :
                  'linear-gradient(to right, #dc2626, #f87171)',
              }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>${collectedThisMonth.toLocaleString()} collected</span>
            <span>${outstanding.toLocaleString()} remaining</span>
          </div>
        </div>
      </div>

      {/* 12-month chart */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-1">Monthly Revenue — Last 12 Months</p>
          <p className="text-xs text-gray-400 mb-5">Collected per month</p>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-[10px] text-gray-400 w-14 text-right pr-2 pb-5 flex-shrink-0">
              <span>${maxVal.toLocaleString()}</span>
              <span>${Math.round(maxVal / 2).toLocaleString()}</span>
              <span>$0</span>
            </div>
            <div className="flex-1">
              <div className="flex items-end gap-1 h-24">
                {months12.map((m, i) => {
                  const h = (m.collected / maxVal) * 100
                  const isCurrent = m.ms === thisMonth
                  return (
                    <div key={i} className="flex-1 group relative flex flex-col items-center gap-0.5">
                      {m.collected > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                          ${m.collected.toLocaleString()}
                        </div>
                      )}
                      <div className="w-full rounded-t-sm"
                        style={{
                          height: `${Math.max(h, m.collected > 0 ? 4 : 1)}%`,
                          background: isCurrent ? 'linear-gradient(to top, #059669, #34d399)' : 'linear-gradient(to top, #a7f3d0, #d1fae5)',
                          minHeight: '2px', opacity: m.collected === 0 ? 0.3 : 1
                        }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1 mt-2">
                {months12.map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    <p className="text-[9px] text-gray-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {/* By Building */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900">Revenue by Building</p>
            <p className="text-xs text-gray-400">{format(now, 'MMMM yyyy')} · all time</p>
          </div>
          <div className="divide-y divide-gray-50">
            {byBuilding.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                  <p className="text-[11px] text-gray-400">${b.expected.toLocaleString()}/mo expected</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">${b.collected.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">{b.rate}% this month</p>
                </div>
              </div>
            ))}
            {byBuilding.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">No buildings</p>}
          </div>
        </div>

        {/* Payment method breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900">Payment Methods</p>
            <p className="text-xs text-gray-400">All time breakdown</p>
          </div>
          <div className="p-5 space-y-3">
            {methodBreakdown.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No payments yet</p>}
            {methodBreakdown.map(m => {
              const pct = allTimeCollected > 0 ? Math.round((m.amount / allTimeCollected) * 100) : 0
              return (
                <div key={m.method}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{m.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{m.count} payments</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">${m.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Outstanding balances */}
      {outstandingLeases.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Outstanding Balances</p>
                <p className="text-xs text-gray-400">{format(now, 'MMMM yyyy')} · tenants who haven't fully paid</p>
              </div>
              <span className="text-sm font-bold text-amber-600">${outstanding.toLocaleString()} total</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Tenant', 'Unit', 'Expected', 'Paid', 'Owes'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstandingLeases.map(l => {
                  const t = (l as any).tenants
                  const u = (l as any).units
                  const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  return (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                      onClick={() => router.push(`/leases/${l.id}`)}>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u?.unit_code ?? '—'} · {u?.buildings?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">${Number(l.rent_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">${l.paidAmt.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-amber-600">${l.owes.toLocaleString()}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partial payments */}
      {partialPayments.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-900">Partial Payments This Month</p>
              <p className="text-xs text-gray-400">Tenants who paid but less than their rent amount</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Tenant', 'Unit', 'Rent', 'Paid', 'Short'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partialPayments.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{p.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.unit} · {p.building}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">${p.expected.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">${p.paid.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-amber-600">${p.short.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


