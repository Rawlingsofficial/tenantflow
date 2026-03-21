'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function OccupancyReport() {
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
  const total = data.units.length
  const occupied = data.units.filter(u => u.status === 'occupied').length
  const vacant = data.units.filter(u => u.status === 'vacant').length
  const maintenance = data.units.filter(u => u.status === 'maintenance').length
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0

  // Revenue at risk: sum of default_rent for vacant units × months vacant
  const revenueAtRisk = data.units
    .filter(u => u.status === 'vacant' && u.default_rent)
    .reduce((s, u) => {
      // Find last lease for this unit
      const lastLease = data.leases
        .filter(l => l.unit_id === u.id && (l.status === 'ended' || l.status === 'terminated'))
        .sort((a, b) => new Date(b.lease_end ?? b.lease_start).getTime() - new Date(a.lease_end ?? a.lease_start).getTime())[0]
      const vacantSince = lastLease?.lease_end ? new Date(lastLease.lease_end) : null
      const daysVacant = vacantSince ? differenceInDays(now, vacantSince) : 0
      const monthsVacant = Math.max(1, Math.round(daysVacant / 30))
      return s + (Number(u.default_rent) * monthsVacant)
    }, 0)

  // Per-building occupancy
  const byBuilding = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bOccupied = bUnits.filter(u => u.status === 'occupied').length
    const bVacant = bUnits.filter(u => u.status === 'vacant').length
    const bMaint = bUnits.filter(u => u.status === 'maintenance').length
    const bRate = bUnits.length > 0 ? Math.round((bOccupied / bUnits.length) * 100) : 0
    return { ...b, total: bUnits.length, occupied: bOccupied, vacant: bVacant, maintenance: bMaint, rate: bRate }
  }).sort((a, b) => b.total - a.total)

  // Unit type breakdown
  const unitTypes = Array.from(new Set(data.units.map(u => u.unit_type ?? 'Unknown')))
  const byType = unitTypes.map(type => {
    const typeUnits = data.units.filter(u => (u.unit_type ?? 'Unknown') === type)
    const typeOccupied = typeUnits.filter(u => u.status === 'occupied').length
    const avgRent = typeUnits.filter(u => u.default_rent).reduce((s, u) => s + Number(u.default_rent), 0) / Math.max(typeUnits.filter(u => u.default_rent).length, 1)
    return {
      type,
      total: typeUnits.length,
      occupied: typeOccupied,
      rate: typeUnits.length > 0 ? Math.round((typeOccupied / typeUnits.length) * 100) : 0,
      avgRent: Math.round(avgRent),
    }
  }).sort((a, b) => b.total - a.total)

  // Vacancy timeline — vacant units and how long they've been empty
  const vacantUnits = data.units.filter(u => u.status === 'vacant').map(u => {
    const bldg = data.buildings.find(b => b.id === u.building_id)
    const lastLease = data.leases
      .filter(l => l.unit_id === u.id && (l.status === 'ended' || l.status === 'terminated'))
      .sort((a, b) => new Date(b.lease_end ?? b.lease_start).getTime() - new Date(a.lease_end ?? a.lease_start).getTime())[0]
    const vacantSince = lastLease?.lease_end ? new Date(lastLease.lease_end) : null
    const daysVacant = vacantSince ? differenceInDays(now, vacantSince) : null
    return { ...u, building: bldg?.name ?? '—', vacantSince, daysVacant, lostRevenue: daysVacant && u.default_rent ? Math.round((Number(u.default_rent) / 30) * daysVacant) : 0 }
  }).sort((a, b) => (b.daysVacant ?? 0) - (a.daysVacant ?? 0))

  // Donut SVG values
  const circumference = 2 * Math.PI * 40
  const occupiedDash = (occupied / Math.max(total, 1)) * circumference
  const vacantDash = (vacant / Math.max(total, 1)) * circumference
  const occupiedOffset = 0
  const vacantOffset = -occupiedDash
  const maintDash = circumference - occupiedDash - vacantDash

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.push('/reports')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Reports
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">Occupancy Report</h1>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Units', value: total, color: 'text-gray-800' },
          { label: 'Occupied', value: occupied, color: 'text-emerald-600' },
          { label: 'Vacant', value: vacant, color: vacant > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Maintenance', value: maintenance, color: maintenance > 0 ? 'text-red-500' : 'text-gray-400' },
          { label: 'Occupancy Rate', value: `${rate}%`, color: rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {/* Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Portfolio Health</p>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                {occupied > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="14"
                    strokeDasharray={`${occupiedDash} ${circumference - occupiedDash}`}
                    strokeDashoffset={0} strokeLinecap="butt" />
                )}
                {vacant > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="14"
                    strokeDasharray={`${vacantDash} ${circumference - vacantDash}`}
                    strokeDashoffset={-occupiedDash} strokeLinecap="butt" />
                )}
                {maintenance > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="14"
                    strokeDasharray={`${maintDash} ${circumference - maintDash}`}
                    strokeDashoffset={-(occupiedDash + vacantDash)} strokeLinecap="butt" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{rate}%</span>
                <span className="text-[10px] text-gray-400">occupied</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              {[
                { label: 'Occupied', count: occupied, color: 'bg-emerald-500', text: 'text-emerald-700' },
                { label: 'Vacant', count: vacant, color: 'bg-amber-400', text: 'text-amber-700' },
                { label: 'Maintenance', count: maintenance, color: 'bg-red-400', text: 'text-red-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{total > 0 ? Math.round((item.count / total) * 100) : 0}%</span>
                    <span className={`text-sm font-bold ${item.text}`}>{item.count}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-50">
                {revenueAtRisk > 0 && (
                  <p className="text-xs text-amber-600 font-semibold">
                    ~${revenueAtRisk.toLocaleString()} revenue at risk from vacancies
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* By building */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Occupancy by Building</p>
          <div className="space-y-3">
            {byBuilding.map(b => (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate flex-1">{b.name}</span>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{b.occupied}/{b.total}</span>
                    <span className={`text-xs font-bold w-8 text-right ${b.rate >= 80 ? 'text-emerald-600' : b.rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{b.rate}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-px">
                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${b.total > 0 ? (b.occupied / b.total) * 100 : 0}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${b.total > 0 ? (b.vacant / b.total) * 100 : 0}%` }} />
                  {b.maintenance > 0 && <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${b.total > 0 ? (b.maintenance / b.total) * 100 : 0}%` }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unit type breakdown */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900">Occupancy by Unit Type</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                {['Unit Type', 'Total', 'Occupied', 'Rate', 'Avg Default Rent'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byType.map(t => (
                <tr key={t.type} className="border-b border-gray-50">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 capitalize">{t.type}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{t.total}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-emerald-600">{t.occupied}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.rate}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${t.rate >= 80 ? 'text-emerald-600' : t.rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{t.rate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{t.avgRent > 0 ? `$${t.avgRent.toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vacancy timeline */}
      {vacantUnits.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Vacancy Timeline</p>
                <p className="text-xs text-gray-400">How long each unit has been empty</p>
              </div>
              {revenueAtRisk > 0 && <span className="text-sm font-bold text-amber-600">~${revenueAtRisk.toLocaleString()} at risk</span>}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Unit', 'Building', 'Type', 'Default Rent', 'Vacant Since', 'Days Empty', 'Est. Lost Revenue'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vacantUnits.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{u.unit_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.building}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{u.unit_type ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.default_rent ? `$${Number(u.default_rent).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.vacantSince ? format(u.vacantSince, 'MMM d, yyyy') : 'Unknown'}</td>
                    <td className="px-4 py-3">
                      {u.daysVacant !== null ? (
                        <span className={`text-sm font-bold ${u.daysVacant > 60 ? 'text-red-600' : u.daysVacant > 30 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {u.daysVacant}d
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-500">
                      {u.lostRevenue > 0 ? `~$${u.lostRevenue.toLocaleString()}` : '—'}
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

