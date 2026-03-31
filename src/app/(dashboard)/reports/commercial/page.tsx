//src/app/(dashboard)/reports/commercial/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, Home, Users, FileText, Wrench, DollarSign,
  TrendingUp, ArrowLeft, ArrowUpRight, ArrowDownRight,
  Download, Filter, ChevronRight, Activity, MapPin, Layers
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function CommercialPortfolioReport() {
  const { orgId } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadPortfolioData(orgId).then(d => { setData(d); setLoading(false) })
  }, [orgId])

  if (loading) return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="h-[400px] rounded-2xl" />
    </div>
  )

  if (!data) return null

  const activeLeases = data.leases.filter((l: any) => l.status === 'active')
  const totalUnits = data.units.length
  
  // GLA metrics
  const totalGLA = data.units.reduce((s: number, u: any) => s + Number(u.area_sqm || 0), 0)
  const occupiedGLA = data.units.filter((u: any) => u.status === 'occupied').reduce((s: number, u: any) => s + Number(u.area_sqm || 0), 0)
  const glaOccRate = totalGLA > 0 ? Math.round((occupiedGLA / totalGLA) * 100) : 0
  
  // Revenue
  const totalRent = activeLeases.reduce((s: number, l: any) => s + Number(l.rent_amount), 0)
  const totalNNN = activeLeases.reduce((s: number, l: any) => s + Number(l.service_charge || 0), 0)

  const kpis = [
    { label: 'GLA Occupancy', value: `${glaOccRate}%`, sub: `${occupiedGLA.toLocaleString()} m² let`, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Run Rate', value: `$${(totalRent + totalNNN).toLocaleString()}`, sub: 'Base + NNN/CAM', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Leases', value: activeLeases.length, sub: 'Commercial contracts', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Assets', value: data.buildings.length, sub: 'Commercial properties', icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50' }
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2">
              <ArrowLeft className="h-4 w-4" /> Back to Intelligence
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Commercial Portfolio Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Cross-asset yields and utilization</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
              <Filter className="h-4 w-4" /> Asset Filter
            </button>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-colors">
              <Download className="h-4 w-4" /> Export P&L Summary
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{k.value}</h3>
              <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Commercial Assets List */}
        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Asset Performance Log</h3>
            <p className="text-sm text-slate-500 mt-1">GLA and Yield metrics per property</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Asset</th>
                  <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Total GLA</th>
                  <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">GLA Occ</th>
                  <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right">Base Rent</th>
                  <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right">NNN/CAM</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.buildings.map((b: any, i: number) => {
                  const bUnits = data.units.filter((u: any) => u.building_id === b.id)
                  const bGLA = bUnits.reduce((s: number, u: any) => s + Number(u.area_sqm || 0), 0)
                  const bOccGLA = bUnits.filter((u: any) => u.status === 'occupied').reduce((s: number, u: any) => s + Number(u.area_sqm || 0), 0)
                  const bRate = bGLA > 0 ? Math.round((bOccGLA / bGLA) * 100) : 0
                  
                  const bLeases = activeLeases.filter((l: any) => bUnits.some(u => u.id === l.unit_id))
                  const bBase = bLeases.reduce((s: number, l: any) => s + Number(l.rent_amount), 0)
                  const bNNN = bLeases.reduce((s: number, l: any) => s + Number(l.service_charge || 0), 0)

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-400 font-medium uppercase">{b.building_type || 'Retail'}</p>
                      </td>
                      <td className="px-8 py-5 font-medium text-slate-600">{bGLA.toLocaleString()} m²</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${bRate >= 90 ? 'bg-emerald-500' : bRate >= 75 ? 'bg-blue-500' : 'bg-rose-500'}`}
                              style={{ width: `${bRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-8">{bRate}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-slate-900">${bBase.toLocaleString()}</td>
                      <td className="px-8 py-5 text-right font-bold text-blue-600">${bNNN.toLocaleString()}</td>
                      <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
