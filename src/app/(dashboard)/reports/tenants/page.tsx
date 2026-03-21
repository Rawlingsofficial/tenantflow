'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Star, AlertCircle } from 'lucide-react'
import { format, differenceInMonths, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function TenantsReport() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadPortfolioData(supabase, orgId).then(d => { setData(d); setLoading(false) })
  }, [orgId])

  if (loading) return <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const thisYear = now.getFullYear()
  const lastYear = thisYear - 1

  const activeTenants = data.tenants.filter(t => t.status === 'active')
  const completedPayments = data.payments.filter(p => p.status === 'completed')

  // Per-tenant stats
  const tenantStats = activeTenants.map(t => {
    const tLeases = data.leases.filter(l => l.tenant_id === t.id)
    const activeLease = tLeases.find(l => l.status === 'active')
    const leaseIds = tLeases.map(l => l.id)
    const tPayments = completedPayments.filter(p => leaseIds.includes(p.lease_id))
    const totalPaid = tPayments.reduce((s, p) => s + Number(p.amount), 0)
    const tenure = activeLease ? differenceInMonths(now, new Date(activeLease.lease_start)) : 0
    const monthsWithLease = activeLease ? differenceInMonths(now, new Date(activeLease.lease_start)) : 0
    const paidMonths = new Set(tPayments.map(p => p.payment_date?.substring(0, 7))).size
    const reliability = monthsWithLease > 0 ? Math.min(100, Math.round((paidMonths / monthsWithLease) * 100)) : 0
    const thisMonthPaid = tPayments.some(p => p.payment_date?.startsWith(thisMonth))
    const name = `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim()
    const u = (activeLease as any)?.units
    return {
      ...t, name, activeLease, totalPaid, tenure, paidMonths, reliability, thisMonthPaid,
      unit: u?.unit_code ?? '—', building: u?.buildings?.name ?? '—',
      monthlyRent: activeLease ? Number(activeLease.rent_amount) : 0,
    }
  }).sort((a, b) => b.totalPaid - a.totalPaid)

  const avgTenure = tenantStats.length > 0
    ? Math.round(tenantStats.reduce((s, t) => s + t.tenure, 0) / tenantStats.length)
    : 0

  const highestPayer = tenantStats[0]

  // Tenure distribution
  const tenureBuckets = [
    { label: '< 3 months', filter: (t: typeof tenantStats[0]) => t.tenure < 3 },
    { label: '3–6 months', filter: (t: typeof tenantStats[0]) => t.tenure >= 3 && t.tenure < 6 },
    { label: '6–12 months', filter: (t: typeof tenantStats[0]) => t.tenure >= 6 && t.tenure < 12 },
    { label: '1–2 years', filter: (t: typeof tenantStats[0]) => t.tenure >= 12 && t.tenure < 24 },
    { label: '2+ years', filter: (t: typeof tenantStats[0]) => t.tenure >= 24 },
  ]

  // Occupation breakdown
  const occupations = activeTenants.reduce((acc: Record<string, number>, t) => {
    const occ = t.occupation ?? 'Unknown'
    acc[occ] = (acc[occ] ?? 0) + 1
    return acc
  }, {})
  const topOccupations = Object.entries(occupations).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Tenants without active lease
  const withoutLease = activeTenants.filter(t => !data.leases.some(l => l.tenant_id === t.id && l.status === 'active'))

  // New tenants this year vs last
  const newThisYear = data.leases.filter(l => new Date(l.lease_start).getFullYear() === thisYear).length
  const newLastYear = data.leases.filter(l => new Date(l.lease_start).getFullYear() === lastYear).length

  function ReliabilityBadge({ score }: { score: number }) {
    if (score >= 90) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">★ Excellent</span>
    if (score >= 70) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Good</span>
    if (score >= 50) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Fair</span>
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Poor</span>
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.push('/reports')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Reports
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">Tenant Report</h1>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Tenants', value: data.tenants.length, sub: `${activeTenants.length} active`, color: 'text-gray-800' },
          { label: 'Avg Tenure', value: `${avgTenure}mo`, sub: 'average active lease duration', color: 'text-emerald-600' },
          { label: 'New Leases This Year', value: newThisYear, sub: `${newLastYear} last year`, color: 'text-blue-600' },
          { label: 'Top Payer', value: highestPayer ? `$${highestPayer.totalPaid.toLocaleString()}` : '—', sub: highestPayer?.name ?? '—', color: 'text-violet-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {/* Tenure distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Tenure Distribution</p>
          <div className="space-y-3">
            {tenureBuckets.map(bucket => {
              const count = tenantStats.filter(bucket.filter).length
              const pct = tenantStats.length > 0 ? Math.round((count / tenantStats.length) * 100) : 0
              return (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700">{bucket.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-sm font-bold text-gray-900 w-6 text-right">{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Occupation breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Tenant Occupations</p>
          <div className="space-y-3">
            {topOccupations.map(([occ, count]) => {
              const pct = activeTenants.length > 0 ? Math.round((count / activeTenants.length) * 100) : 0
              return (
                <div key={occ}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700 capitalize">{occ}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-sm font-bold text-gray-900 w-6 text-right">{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {topOccupations.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No occupation data</p>}
          </div>
        </div>
      </div>

      {/* Payment reliability table */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900">Payment Reliability</p>
            <p className="text-xs text-gray-400">Based on months paid vs months as tenant — higher is better</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                {['Tenant', 'Unit', 'Tenure', 'Total Paid', 'Months Paid', 'Rate', 'This Month', 'Rating'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenantStats.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => router.push(`/tenants/${t.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                        {t.photo_url
                          ? <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-emerald-700">
                              {(t.first_name?.[0] ?? '?').toUpperCase()}
                            </div>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{t.name || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{t.unit}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{t.tenure}mo</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-emerald-600">${t.totalPaid.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{t.paidMonths}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${t.reliability}%`, backgroundColor: t.reliability >= 90 ? '#059669' : t.reliability >= 70 ? '#3b82f6' : t.reliability >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{t.reliability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {t.thisMonthPaid
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Paid</span>
                      : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Unpaid</span>}
                  </td>
                  <td className="px-4 py-3.5"><ReliabilityBadge score={t.reliability} /></td>
                </tr>
              ))}
              {tenantStats.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">No active tenants</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenants without lease alert */}
      {withoutLease.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800">{withoutLease.length} active tenant{withoutLease.length > 1 ? 's' : ''} without an active lease</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {withoutLease.map(t => (
                <button key={t.id} onClick={() => router.push(`/tenants/${t.id}`)}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors">
                  {`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown'}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-3">Consider creating a lease or marking them inactive.</p>
          </div>
        </div>
      )}
    </div>
  )
}



