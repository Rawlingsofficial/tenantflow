'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Building2 } from 'lucide-react'

export default function CommercialOccupancyReportPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = useSupabaseWithAuth()
  const [loading, setLoading] = useState(true)
  const [buildings, setBuildings] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const { data: bData } = await (supabase as any).from('buildings').select('id, name, address, status').eq('organization_id', orgId!)
    const bIds = (bData ?? []).map((b: any) => b.id)
    let uData: any[] = []
    if (bIds.length > 0) {
      const { data } = await (supabase as any).from('units')
        .select('id, unit_code, status, unit_purpose, area_sqm, floor_number, default_rent, building_id')
        .in('building_id', bIds)
      uData = data ?? []
    }
    setBuildings(bData ?? [])
    setUnits(uData)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
    </div>
  )

  const totalUnits = units.length
  const occupied = units.filter(u => u.status === 'occupied').length
  const vacant = units.filter(u => u.status === 'vacant').length
  const maintenance = units.filter(u => u.status === 'maintenance').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0
  const totalArea = units.reduce((s, u) => s + Number(u.area_sqm ?? 0), 0)
  const occupiedArea = units.filter(u => u.status === 'occupied').reduce((s, u) => s + Number(u.area_sqm ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.push('/commercial/reports')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Reports
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">Space Occupancy</h1>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Spaces', value: totalUnits, color: 'text-gray-800' },
          { label: 'Occupied', value: occupied, color: 'text-emerald-600' },
          { label: 'Available', value: vacant, color: 'text-amber-600' },
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, color: occupancyRate >= 80 ? 'text-emerald-600' : 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Portfolio Occupancy</p>
            <p className="text-sm font-bold text-emerald-600">{occupancyRate}%</p>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(occupied / Math.max(totalUnits, 1)) * 100}%` }} />
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${(vacant / Math.max(totalUnits, 1)) * 100}%` }} />
            <div className="h-full bg-red-300 transition-all" style={{ width: `${(maintenance / Math.max(totalUnits, 1)) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { label: 'Occupied', count: occupied, color: 'bg-emerald-500' },
              { label: 'Vacant', count: vacant, color: 'bg-amber-400' },
              { label: 'Maintenance', count: maintenance, color: 'bg-red-300' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                <span className="text-xs text-gray-500">{s.label} ({s.count})</span>
              </div>
            ))}
          </div>
          {totalArea > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              {occupiedArea.toLocaleString()} m² occupied of {totalArea.toLocaleString()} m² total
            </p>
          )}
        </div>
      </div>

      {/* Per-building breakdown */}
      <div className="px-6 pb-8 space-y-4">
        {buildings.map(b => {
          const bUnits = units.filter(u => u.building_id === b.id)
          const bOcc = bUnits.filter(u => u.status === 'occupied').length
          const bVac = bUnits.filter(u => u.status === 'vacant').length
          const bRate = bUnits.length > 0 ? Math.round((bOcc / bUnits.length) * 100) : 0
          return (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                    {b.address && <p className="text-xs text-gray-400">{b.address}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{bRate}%</p>
                  <p className="text-xs text-gray-400">{bOcc}/{bUnits.length} occupied</p>
                </div>
              </div>
              {bUnits.length > 0 && (
                <div className="grid grid-cols-1 divide-y divide-gray-50">
                  {bUnits.map(u => (
                    <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{u.unit_code}</p>
                        <p className="text-xs text-gray-400">
                          {u.unit_purpose ?? 'Office'}
                          {u.area_sqm ? ` · ${u.area_sqm}m²` : ''}
                          {u.floor_number ? ` · Floor ${u.floor_number}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        u.status === 'occupied' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        u.status === 'maintenance' ? 'bg-red-50 text-red-600 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>{u.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
