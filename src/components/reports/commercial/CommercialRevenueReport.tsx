//src/components/reports/commercial/CommercialRevenueReport.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/ui/kpi-card'
import { RevenueChart } from '@/components/reports/RevenueChart'
import { ArrowLeft, DollarSign, Layers, TrendingUp, AlertCircle } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function CommercialRevenueReport() {
  const { orgId, getToken } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!orgId) return
      setLoading(true)
      try {
        const token = await getToken({ template: 'supabase' })
        const supabase = getSupabaseBrowserClient(token ?? undefined)
        const d = await loadPortfolioData(supabase, orgId)
        setData(d)
      } catch (err) {
        console.error('Error loading commercial revenue data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId, getToken])

  if (loading) return (
    <div className="min-h-screen bg-[#080a0f] p-6 space-y-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-white/[0.04]" />)}
    </div>
  )
  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const activeLeases = data.leases.filter(l => l.status === 'active')
  const completed = data.payments.filter(p => p.status === 'completed')

  const totalBaseRent = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const totalNNN = activeLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
  const totalRunRate = totalBaseRent + totalNNN

  const collectedThisMonth = completed.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const collectedLastMonth = completed.filter(p => p.payment_date?.startsWith(lastMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const outstanding = Math.max(0, totalRunRate - collectedThisMonth)
  const collectionRate = totalRunRate > 0 ? Math.round((collectedThisMonth / totalRunRate) * 100) : 0
  const allTime = completed.reduce((s, p) => s + Number(p.amount), 0)
  const revDelta = collectedLastMonth > 0 ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100) : 0

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const value = completed.filter(p => p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), month: ms, value }
  })

  // Payment method breakdown
  const methods = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
  const methodBreakdown = methods.map(m => ({
    method: m,
    label: m === 'bank_transfer' ? 'Bank Transfer' : m === 'mobile_money' ? 'Mobile Money' : m.charAt(0).toUpperCase() + m.slice(1),
    count: completed.filter(p => (p.method ?? 'other') === m).length,
    amount: completed.filter(p => (p.method ?? 'other') === m).reduce((s, p) => s + Number(p.amount), 0),
  })).filter(m => m.count > 0).sort((a, b) => b.amount - a.amount)

  // Lease-by-lease breakdown
  const leaseBreakdown = activeLeases.map(l => {
    const tenant = data.tenants.find(t => t.id === l.tenant_id)
    const unit = data.units.find(u => u.id === l.unit_id)
    const building = data.buildings.find(b => b.id === unit?.building_id)
    const paid = completed.filter(p => p.lease_id === l.id && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
    const total = Number(l.rent_amount) + Number(l.service_charge ?? 0)
    return {
      id: l.id,
      tenant: tenant?.company_name ?? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim(),
      unit: unit?.unit_code ?? '—',
      building: building?.name ?? '—',
      baseRent: Number(l.rent_amount),
      nnn: Number(l.service_charge ?? 0),
      total,
      paid,
      owes: Math.max(0, total - paid),
    }
  }).sort((a, b) => b.total - a.total)

  // Outstanding leases
  const outstandingLeases = leaseBreakdown.filter(l => l.owes > 0)

  return (
    <div className="min-h-screen bg-[#080a0f] pb-12 font-sans">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-white/[0.05]">
        <button onClick={() => router.push('/reports')}
          className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Reports
        </button>
        <span className="text-gray-700">/</span>
        <h1 className="text-sm font-bold text-white">Revenue Intelligence</h1>
        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full ml-1">
          {format(now, 'MMM yyyy')}
        </span>
      </div>

      {/* KPIs */}
      <div className="px-6 pt-5 grid grid-cols-4 gap-3 mb-5">
        <KpiCard variant="dark" label="Base Rent" value={`$${totalBaseRent.toLocaleString()}`}
          sub={`${activeLeases.length} leases`} accent="gray" icon={DollarSign} />
        <KpiCard variant="dark" label="NNN / CAM Charges" value={`$${totalNNN.toLocaleString()}`}
          sub={`${activeLeases.filter(l => Number(l.service_charge ?? 0) > 0).length} leases with NNN`}
          accent="blue" icon={Layers} />
        <KpiCard variant="dark" label="Collected This Month" value={`$${collectedThisMonth.toLocaleString()}`}
          sub={`${collectionRate}% collection rate`}
          trend={{ value: revDelta, label: 'vs last month' }}
          accent="emerald" icon={TrendingUp} />
        <KpiCard variant="dark" label="Outstanding" value={`$${outstanding.toLocaleString()}`}
          sub={`${outstandingLeases.length} tenant${outstandingLeases.length !== 1 ? 's' : ''} owe`}
          accent={outstanding > 0 ? 'amber' : 'gray'} icon={AlertCircle} />
      </div>

      {/* Collection rate bar */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-white">Collection Rate — {format(now, 'MMMM yyyy')}</p>
            <span className={`text-lg font-bold ${collectionRate >= 90 ? 'text-emerald-400' : collectionRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
              {collectionRate}%
            </span>
          </div>
          <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(collectionRate, 100)}%`,
                background: collectionRate >= 90
                  ? 'linear-gradient(to right, #059669, #34d399)'
                  : collectionRate >= 70
                    ? 'linear-gradient(to right, #d97706, #fbbf24)'
                    : 'linear-gradient(to right, #dc2626, #f87171)',
              }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>${collectedThisMonth.toLocaleString()} collected</span>
            <span>${outstanding.toLocaleString()} remaining</span>
          </div>
        </div>
      </div>

      {/* 12-month chart */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-bold text-white">Monthly Collections — 12 Months</p>
            <p className="text-sm font-bold text-white">${allTime.toLocaleString()}
              <span className="text-[10px] text-gray-600 font-normal ml-1">all-time</span>
            </p>
          </div>
          <p className="text-[11px] text-gray-600 mb-4">Total including NNN/CAM</p>
          <RevenueChart data={chartData} currentMonth={thisMonth} variant="dark" height={120} showAvg />
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {/* By building */}
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.04]">
            <p className="text-[13px] font-bold text-white">Revenue by Building</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{format(now, 'MMMM yyyy')}</p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {data.buildings.map(b => {
              const bUnits = data.units.filter(u => u.building_id === b.id)
              const bLeases = activeLeases.filter(l => bUnits.some(u => u.id === l.unit_id))
              const bLeaseIds = bLeases.map(l => l.id)
              const bExpected = bLeases.reduce((s, l) => s + Number(l.rent_amount) + Number(l.service_charge ?? 0), 0)
              const bCollected = completed.filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
              const bRate = bExpected > 0 ? Math.round((bCollected / bExpected) * 100) : 0
              return (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-gray-200">{b.name}</p>
                    <p className="text-[10px] text-gray-600">${bExpected.toLocaleString()}/mo expected</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">${bCollected.toLocaleString()}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${bRate >= 90 ? 'text-emerald-400' : bRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {bRate}% this month
                    </span>
                  </div>
                </div>
              )
            })}
            {data.buildings.length === 0 && <p className="px-5 py-6 text-sm text-gray-600 text-center">No buildings</p>}
          </div>
        </div>

        {/* Payment method breakdown */}
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <p className="text-[13px] font-bold text-white mb-1">Payment Methods</p>
          <p className="text-[11px] text-gray-600 mb-4">All-time breakdown</p>
          <div className="space-y-3">
            {methodBreakdown.length === 0 && <p className="text-sm text-gray-600 text-center py-4">No payments yet</p>}
            {methodBreakdown.map(m => {
              const pct = allTime > 0 ? Math.round((m.amount / allTime) * 100) : 0
              return (
                <div key={m.method}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-[12px] font-medium text-gray-300">{m.label}</span>
                      <span className="text-[10px] text-gray-600 ml-2">{m.count} payments</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-200">${m.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-600 ml-2">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
          <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-white">Outstanding Balances</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{format(now, 'MMMM yyyy')} · Base rent + NNN</p>
              </div>
              <span className="text-sm font-bold text-amber-400">${outstanding.toLocaleString()} total</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Tenant', 'Unit', 'Base Rent', 'NNN', 'Total Due', 'Paid', 'Owes'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstandingLeases.map(l => (
                  <tr key={l.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => router.push(`/leases/${l.id}`)}>
                    <td className="px-6 py-3 text-[13px] font-semibold text-gray-200">{l.tenant || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{l.unit} · {l.building}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">${l.baseRent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-sky-400">{l.nnn > 0 ? `$${l.nnn.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-200">${l.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-400">${l.paid.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-amber-400">${l.owes.toLocaleString()}</span>
                    </td>
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

