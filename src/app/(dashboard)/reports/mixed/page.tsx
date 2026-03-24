'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Building2, MapPin, AlertCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function CommercialOccupancyReport() {
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
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />)}
    </div>
  )
  if (!data) return null

  const now = new Date()
  const total = data.units.length
  const occupied = data.units.filter(u => u.status === 'occupied').length
  const vacant = data.units.filter(u => u.status === 'vacant').length
  const maintenance = data.units.filter(u => u.status === 'maintenance').length
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0

  // GLA metrics – cast u to any to access area_sqm (present in DB but not in ReportUnit)
  const totalGLA = data.units.reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
  const occupiedGLA = data.units.filter(u => u.status === 'occupied').reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
  const vacantGLA = data.units.filter(u => u.status === 'vacant').reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
  const glaOccRate = totalGLA > 0 ? Math.round((occupiedGLA / totalGLA) * 100) : 0

  // Revenue at risk from vacant units – cast u to any for default_rent
  const revenueAtRisk = data.units
    .filter(u => u.status === 'vacant' && (u as any).default_rent)
    .reduce((s, u) => {
      const lastLease = data.leases
        .filter(l => l.unit_id === u.id && (l.status === 'ended' || l.status === 'terminated'))
        .sort((a, b) => new Date(b.lease_end ?? b.lease_start).getTime() - new Date(a.lease_end ?? a.lease_start).getTime())[0]
      const vacantSince = lastLease?.lease_end ? new Date(lastLease.lease_end) : null
      const daysVacant = vacantSince ? differenceInDays(now, vacantSince) : 0
      const monthsVacant = Math.max(1, Math.round(daysVacant / 30))
      return s + (Number((u as any).default_rent) * monthsVacant)
    }, 0)

  // Per-building
  const byBuilding = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bOccupied = bUnits.filter(u => u.status === 'occupied').length
    const bArea = bUnits.reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
    const bOccArea = bUnits.filter(u => u.status === 'occupied').reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
    return {
      ...b, total: bUnits.length, occupied: bOccupied,
      vacant: bUnits.filter(u => u.status === 'vacant').length,
      maint: bUnits.filter(u => u.status === 'maintenance').length,
      area: bArea, occArea: bOccArea,
      unitRate: bUnits.length > 0 ? Math.round((bOccupied / bUnits.length) * 100) : 0,
      glaRate: bArea > 0 ? Math.round((bOccArea / bArea) * 100) : 0,
    }
  }).sort((a, b) => b.total - a.total)

  // Vacant units detail
  const vacantUnits = data.units.filter(u => u.status === 'vacant').map(u => {
    const b = data.buildings.find(x => x.id === u.building_id)
    const lastLease = data.leases
      .filter(l => l.unit_id === u.id && (l.status === 'ended' || l.status === 'terminated'))
      .sort((a, b) => new Date(b.lease_end ?? b.lease_start).getTime() - new Date(a.lease_end ?? a.lease_start).getTime())[0]
    const vacantSince = lastLease?.lease_end ? new Date(lastLease.lease_end) : null
    const daysVacant = vacantSince ? differenceInDays(now, vacantSince) : null
    const lostRev = daysVacant && (u as any).default_rent ? Math.round((Number((u as any).default_rent) / 30) * daysVacant) : 0
    return { ...u, buildingName: b?.name ?? '—', vacantSince, daysVacant, lostRev }
  }).sort((a, b) => (b.daysVacant ?? 0) - (a.daysVacant ?? 0))

  // Unit type / purpose breakdown – cast u to any for unit_purpose and unit_type
  const purposes = Array.from(new Set(data.units.map(u => (u as any).unit_purpose ?? (u as any).unit_type ?? 'Unknown')))
  const byPurpose = purposes.map(p => {
    const pUnits = data.units.filter(u => ((u as any).unit_purpose ?? (u as any).unit_type ?? 'Unknown') === p)
    const pOcc = pUnits.filter(u => u.status === 'occupied').length
    const pArea = pUnits.reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
    return { purpose: p, total: pUnits.length, occupied: pOcc, area: pArea, rate: pUnits.length > 0 ? Math.round((pOcc / pUnits.length) * 100) : 0 }
  }).sort((a, b) => b.total - a.total)

  return (
    <div className="min-h-screen bg-[#080a0f] pb-12 font-sans">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-white/[0.05]">
        <button onClick={() => router.push('/commercial/reports')} className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Commercial Reports
        </button>
        <span className="text-gray-700">/</span>
        <h1 className="text-sm font-bold text-white">Occupancy & GLA</h1>
      </div>

      {/* KPIs */}
      <div className="px-6 pt-5 grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Units', value: total, color: '#e2e8f0' },
          { label: 'Let', value: occupied, color: '#10b981' },
          { label: 'Vacant', value: vacant, color: vacant > 0 ? '#f59e0b' : '#6b7280' },
          { label: 'Occupancy (Units)', value: `${rate}%`, color: rate >= 90 ? '#10b981' : rate >= 75 ? '#f59e0b' : '#f43f5e' },
          { label: 'Occupancy (GLA)', value: totalGLA > 0 ? `${glaOccRate}%` : 'N/A', color: glaOccRate >= 90 ? '#10b981' : glaOccRate >= 75 ? '#f59e0b' : '#f43f5e' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl bg-[#0f1117] border border-white/[0.06] px-4 py-4">
            <p className="text-[9px] font-semibold tracking-[0.12em] text-gray-600 uppercase mb-2">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* GLA summary */}
      {totalGLA > 0 && (
        <div className="px-6 mb-5">
          <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
            <p className="text-sm font-bold text-white mb-3">Gross Leasable Area</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-600">Let: {occupiedGLA.toLocaleString()} m²</span>
                  <span className="text-[10px] text-gray-600">Vacant: {vacantGLA.toLocaleString()} m²</span>
                </div>
                <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden flex">
                  <div style={{ width: `${glaOccRate}%` }} className="h-full bg-emerald-500 transition-all duration-700" />
                  <div style={{ width: `${totalGLA > 0 ? (vacantGLA / totalGLA) * 100 : 0}%` }} className="h-full bg-amber-500/60" />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-white">{totalGLA.toLocaleString()} m²</p>
                <p className="text-[10px] text-gray-600">total GLA</p>
              </div>
            </div>
            {revenueAtRisk > 0 && (
              <p className="text-[11px] text-amber-400 font-semibold mt-3 pt-3 border-t border-white/[0.04]">
                ~${revenueAtRisk.toLocaleString()} revenue at risk from {vacant} vacant unit{vacant > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {/* By building */}
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.04]">
            <p className="text-sm font-bold text-white">By Building</p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {byBuilding.map(b => (
              <div key={b.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{b.name}</p>
                    <p className="text-[10px] text-gray-600">{b.area > 0 ? `${b.area.toLocaleString()} m²` : `${b.total} units`}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    b.unitRate >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    b.unitRate >= 75 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>{b.unitRate}%</span>
                </div>
                <div className="flex h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div style={{ width: `${b.unitRate}%` }} className="h-full bg-indigo-500 transition-all duration-700 rounded-full" />
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-gray-600">
                  <span className="text-emerald-500">{b.occupied} let</span>
                  {b.vacant > 0 && <span className="text-amber-500">{b.vacant} vacant</span>}
                  {b.maint > 0 && <span className="text-rose-500">{b.maint} maint.</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By purpose/type */}
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.04]">
            <p className="text-sm font-bold text-white">By Use / Purpose</p>
          </div>
          <div className="p-5 space-y-4">
            {byPurpose.map(p => (
              <div key={p.purpose}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-300 capitalize">{p.purpose}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600">{p.area > 0 ? `${p.area.toLocaleString()} m²` : `${p.total} units`}</span>
                    <span className="text-xs font-bold text-indigo-400">{p.rate}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div style={{ width: `${p.rate}%` }} className="h-full bg-indigo-500 rounded-full transition-all duration-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vacancy detail */}
      {vacantUnits.length > 0 && (
        <div className="px-6 mb-5">
          <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Vacant Units</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Duration and estimated lost revenue</p>
              </div>
              {revenueAtRisk > 0 && <span className="text-sm font-bold text-amber-400">~${revenueAtRisk.toLocaleString()} at risk</span>}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Unit', 'Building', 'Type', 'Area (m²)', 'Asking Rent', 'Days Empty', 'Est. Lost'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-5">{h}</th>
                  ))}
                 </tr>
              </thead>
              <tbody>
                {vacantUnits.map(u => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-200">{u.unit_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.buildingName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{(u as any).unit_purpose ?? (u as any).unit_type ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{(u as any).area_sqm ? Number((u as any).area_sqm).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{(u as any).default_rent ? `$${Number((u as any).default_rent).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      {u.daysVacant !== null ? (
                        <span className={`text-sm font-bold ${u.daysVacant > 60 ? 'text-rose-400' : u.daysVacant > 30 ? 'text-amber-400' : 'text-gray-400'}`}>
                          {u.daysVacant}d
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-rose-400">
                      {u.lostRev > 0 ? `~$${u.lostRev.toLocaleString()}` : '—'}
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

