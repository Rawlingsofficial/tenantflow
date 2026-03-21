'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { format, differenceInDays, differenceInMonths, addMonths } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function LeasesReport() {
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
  const activeLeases = data.leases.filter(l => l.status === 'active')
  const endedLeases = data.leases.filter(l => l.status === 'ended' || l.status === 'terminated')

  // KPIs
  const avgLeaseValue = activeLeases.length > 0
    ? Math.round(activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0) / activeLeases.length)
    : 0

  const expiring30 = activeLeases.filter(l => {
    if (!l.lease_end) return false
    const d = differenceInDays(new Date(l.lease_end), now)
    return d >= 0 && d <= 30
  }).length

  const expiring60 = activeLeases.filter(l => {
    if (!l.lease_end) return false
    const d = differenceInDays(new Date(l.lease_end), now)
    return d > 30 && d <= 60
  }).length

  // Renewal rate: ended leases where same tenant got a new lease on same unit
  const renewedCount = endedLeases.filter(ended => {
    return data.leases.some(l =>
      l.id !== ended.id &&
      l.tenant_id === ended.tenant_id &&
      l.unit_id === ended.unit_id &&
      new Date(l.lease_start) >= new Date(ended.lease_end ?? ended.lease_start)
    )
  }).length
  const renewalRate = endedLeases.length > 0 ? Math.round((renewedCount / endedLeases.length) * 100) : 0

  // Expiration calendar — next 12 months
  const expirationCalendar = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(now, i)
    const ms = format(month, 'yyyy-MM')
    const expiring = activeLeases.filter(l => l.lease_end?.startsWith(ms))
    return { label: format(month, 'MMM yyyy'), ms, count: expiring.length, leases: expiring }
  })

  // Rent deviation — agreed vs default
  const rentDeviation = activeLeases
    .map(l => {
      const u = (l as any).units
      const defaultRent = u?.default_rent ? Number(u.default_rent) : null
      const agreedRent = Number(l.rent_amount)
      const diff = defaultRent !== null ? agreedRent - defaultRent : null
      const pct = defaultRent && defaultRent > 0 ? Math.round((diff! / defaultRent) * 100) : null
      const t = (l as any).tenants
      return {
        id: l.id,
        tenant: `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim(),
        unit: u?.unit_code ?? '—',
        building: u?.buildings?.name ?? '—',
        defaultRent,
        agreedRent,
        diff,
        pct,
      }
    })
    .filter(l => l.defaultRent !== null && l.diff !== 0)
    .sort((a, b) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0))

  // Lease duration distribution (ended leases)
  const durations = endedLeases
    .filter(l => l.lease_end)
    .map(l => differenceInMonths(new Date(l.lease_end!), new Date(l.lease_start)))
    .filter(d => d > 0)
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  const durationBuckets = [
    { label: '< 6 months', filter: (d: number) => d < 6 },
    { label: '6–12 months', filter: (d: number) => d >= 6 && d < 12 },
    { label: '1–2 years', filter: (d: number) => d >= 12 && d < 24 },
    { label: '2+ years', filter: (d: number) => d >= 24 },
  ]

  // Average rent by unit type
  const unitTypes = Array.from(new Set(activeLeases.map(l => (l as any).units?.unit_type ?? 'Unknown')))
  const rentByType = unitTypes.map(type => {
    const typeLeases = activeLeases.filter(l => ((l as any).units?.unit_type ?? 'Unknown') === type)
    const avg = typeLeases.length > 0
      ? Math.round(typeLeases.reduce((s, l) => s + Number(l.rent_amount), 0) / typeLeases.length)
      : 0
    return { type, count: typeLeases.length, avg, total: typeLeases.reduce((s, l) => s + Number(l.rent_amount), 0) }
  }).sort((a, b) => b.avg - a.avg)

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.push('/reports')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Reports
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">Lease Health Report</h1>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Active Leases', value: activeLeases.length, color: 'text-gray-800', sub: `${data.leases.length} total` },
          { label: 'Expiring 30d', value: expiring30, color: expiring30 > 0 ? 'text-amber-600' : 'text-gray-400', sub: 'need renewal' },
          { label: 'Expiring 60d', value: expiring60, color: expiring60 > 0 ? 'text-amber-500' : 'text-gray-400', sub: 'plan ahead' },
          { label: 'Avg Lease Value', value: `$${avgLeaseValue.toLocaleString()}`, color: 'text-emerald-600', sub: 'per month' },
          { label: 'Renewal Rate', value: `${renewalRate}%`, color: renewalRate >= 70 ? 'text-emerald-600' : 'text-amber-600', sub: `${renewedCount} of ${endedLeases.length} renewed` },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Expiration calendar */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-1">Expiration Calendar</p>
          <p className="text-xs text-gray-400 mb-4">Number of leases expiring each month for the next 12 months</p>
          <div className="grid grid-cols-6 gap-2">
            {expirationCalendar.map((m, i) => (
              <div key={i} className={`rounded-xl p-3 border text-center transition-colors ${
                m.count === 0 ? 'bg-gray-50 border-gray-100' :
                i <= 1 ? 'bg-red-50 border-red-200' :
                i <= 2 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
              }`}>
                <p className="text-[10px] text-gray-400 font-medium">{m.label}</p>
                <p className={`text-2xl font-bold mt-1 ${
                  m.count === 0 ? 'text-gray-300' :
                  i <= 1 ? 'text-red-600' :
                  i <= 2 ? 'text-amber-600' : 'text-blue-600'
                }`}>{m.count}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.count === 1 ? 'lease' : 'leases'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {/* Lease duration distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-1">Lease Duration Distribution</p>
          <p className="text-xs text-gray-400 mb-4">Based on {endedLeases.length} completed leases · avg {avgDuration}mo</p>
          <div className="space-y-3">
            {durationBuckets.map(bucket => {
              const count = durations.filter(bucket.filter).length
              const pct = durations.length > 0 ? Math.round((count / durations.length) * 100) : 0
              return (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700">{bucket.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-sm font-bold text-gray-900 w-5 text-right">{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {durations.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No ended leases yet</p>}
          </div>
        </div>

        {/* Avg rent by unit type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-1">Average Rent by Unit Type</p>
          <p className="text-xs text-gray-400 mb-4">From active leases only</p>
          <div className="space-y-3">
            {rentByType.map(r => (
              <div key={r.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{r.type}</p>
                  <p className="text-[11px] text-gray-400">{r.count} active lease{r.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">${r.avg.toLocaleString()}/mo</p>
                  <p className="text-[10px] text-gray-400">${r.total.toLocaleString()} total</p>
                </div>
              </div>
            ))}
            {rentByType.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No active leases</p>}
          </div>
        </div>
      </div>

      {/* Rent deviation table */}
      {rentDeviation.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-900">Rent vs Default Analysis</p>
              <p className="text-xs text-gray-400">Leases where agreed rent differs from unit's default rent</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Tenant', 'Unit', 'Default Rent', 'Agreed Rent', 'Difference', '%'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rentDeviation.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                    onClick={() => router.push(`/leases/${r.id}`)}>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{r.tenant || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.unit} · {r.building}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">${r.defaultRent?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">${r.agreedRent.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${(r.diff ?? 0) > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {(r.diff ?? 0) > 0 ? '+' : ''}${r.diff?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        (r.pct ?? 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {(r.pct ?? 0) > 0 ? '+' : ''}{r.pct}%
                      </span>
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


