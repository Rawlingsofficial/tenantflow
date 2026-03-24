'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, DollarSign, Layers, TrendingUp, AlertCircle } from 'lucide-react'
import { format, subMonths, differenceInMonths } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function CommercialRevenueReport() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadPortfolioData(supabase, orgId).then(d => { setData(d); setLoading(false) })
  }, [orgId])

  if (loading) return (
    <div className="min-h-screen bg-[#080a0f] p-6 space-y-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />)}
    </div>
  )
  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const activeLeases = data.leases.filter(l => l.status === 'active')
  const completed = data.payments.filter(p => p.status === 'completed')

  const totalBaseRent = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  // Cast to any to access service_charge (exists in DB but not in ReportLease type)
  const totalNNN = activeLeases.reduce((s, l) => s + Number((l as any).service_charge ?? 0), 0)
  const totalRunRate = totalBaseRent + totalNNN

  const collectedThisMonth = completed.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const outstanding = Math.max(0, totalRunRate - collectedThisMonth)
  const collectionRate = totalRunRate > 0 ? Math.round((collectedThisMonth / totalRunRate) * 100) : 0
  const allTime = completed.reduce((s, p) => s + Number(p.amount), 0)

  const months12 = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const val = completed.filter(p => p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), ms, val }
  })
  const maxVal = Math.max(...months12.map(m => m.val), 1)

  // Lease-by-lease breakdown
  // Lease-by-lease breakdown
const leaseBreakdown = activeLeases.map(l => {
  const tenant = data.tenants.find(t => t.id === l.tenant_id)
  const unit = data.units.find(u => u.id === l.unit_id)
  const building = data.buildings.find(b => b.id === unit?.building_id)
  const thisPaid = completed.filter(p => p.lease_id === l.id && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const total = Number(l.rent_amount) + Number((l as any).service_charge ?? 0)
  const owes = Math.max(0, total - thisPaid)
  return {
    id: l.id,
    tenant: (tenant as any)?.company_name ?? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim(),
    unit: unit?.unit_code ?? '—',
    building: building?.name ?? '—',
    baseRent: Number(l.rent_amount),
    nnn: Number((l as any).service_charge ?? 0),
    total,
    paid: thisPaid,
    owes,
  }
}).sort((a, b) => b.total - a.total)

  return (
    <div className="min-h-screen bg-[#080a0f] pb-12 font-sans">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-white/[0.05]">
        <button onClick={() => router.push('/commercial/reports')} className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Commercial Reports
        </button>
        <span className="text-gray-700">/</span>
        <h1 className="text-sm font-bold text-white">Revenue Intelligence</h1>
        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full ml-1">{format(now, 'MMM yyyy')}</span>
      </div>

      <div className="px-6 pt-5 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Base Rent', value: `$${totalBaseRent.toLocaleString()}`, sub: `${activeLeases.length} leases`, color: '#e2e8f0', icon: DollarSign },
          { label: 'NNN / CAM', value: `$${totalNNN.toLocaleString()}`, sub: 'service charges', color: '#818cf8', icon: Layers },
          { label: 'Collected This Month', value: `$${collectedThisMonth.toLocaleString()}`, sub: `${collectionRate}% rate`, color: '#10b981', icon: TrendingUp },
          { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, sub: 'remaining this month', color: outstanding > 0 ? '#f59e0b' : '#6b7280', icon: AlertCircle },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-semibold tracking-[0.12em] text-gray-600 uppercase">{kpi.label}</p>
              <kpi.icon className="h-3.5 w-3.5 text-gray-700" />
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-[10px] text-gray-600 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Collection rate bar */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">Collection Rate — {format(now, 'MMMM yyyy')}</p>
            <span className={`text-lg font-bold ${collectionRate >= 90 ? 'text-emerald-400' : collectionRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{collectionRate}%</span>
          </div>
          <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(collectionRate, 100)}%`, background: collectionRate >= 90 ? 'linear-gradient(to right,#059669,#34d399)' : collectionRate >= 70 ? 'linear-gradient(to right,#d97706,#fbbf24)' : 'linear-gradient(to right,#dc2626,#f87171)' }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-600">
            <span>${collectedThisMonth.toLocaleString()} collected</span>
            <span>${outstanding.toLocaleString()} remaining</span>
          </div>
        </div>
      </div>

      {/* 12-month chart */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <p className="text-sm font-bold text-white mb-1">Monthly Collections — 12 Months</p>
          <p className="text-[10px] text-gray-600 mb-5">Total including NNN/CAM</p>
          <div className="flex items-end gap-1.5 h-20">
            {months12.map((m, i) => {
              const h = (m.val / maxVal) * 100
              const isCurrent = m.ms === thisMonth
              return (
                <div key={i} className="flex-1 group relative flex flex-col items-center gap-0.5">
                  {m.val > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1f2e] border border-white/10 text-white text-[9px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                      ${m.val.toLocaleString()}
                    </div>
                  )}
                  <div className="w-full rounded-t-sm" style={{ height: `${Math.max(h, m.val > 0 ? 4 : 1)}%`, background: isCurrent ? 'linear-gradient(to top,#6366f1,#a5b4fc)' : 'rgba(99,102,241,0.35)', minHeight: '2px' }} />
                  <p className="text-[8px] text-gray-600">{m.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Lease breakdown */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Lease Revenue Breakdown</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{format(now, 'MMMM yyyy')}</p>
            </div>
            <span className="text-sm font-bold text-emerald-400">${collectedThisMonth.toLocaleString()} total</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Tenant', 'Unit', 'Base Rent', 'NNN/CAM', 'Total Due', 'Paid', 'Owes'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-5">{h}</th>
                ))}
               </tr>
            </thead>
            <tbody>
              {leaseBreakdown.map(l => (
                <tr key={l.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => router.push(`/leases/${l.id}`)}>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-200">{l.tenant || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{l.unit} · {l.building}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">${l.baseRent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-indigo-400">{l.nnn > 0 ? `$${l.nnn.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-white">${l.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-400">{l.paid > 0 ? `$${l.paid.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    {l.owes > 0
                      ? <span className="text-sm font-bold text-amber-400">${l.owes.toLocaleString()}</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Clear</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}