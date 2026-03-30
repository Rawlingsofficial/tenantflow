//src/app/(dashboard)/reports/occupancy/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { useOrgStore } from '@/store/orgStore'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, ArrowLeft, ArrowUpRight, ArrowDownRight, Clock, Info,
  Search, LayoutPanelLeft, FileSpreadsheet, BarChart2
} from 'lucide-react'
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar
} from 'recharts'
import Link from 'next/link'
import { subMonths, format, isSameMonth, eachMonthOfInterval } from 'date-fns'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CompareToggle } from '@/components/shared/CompareToggle'
import { EmptyState } from '@/components/shared/EmptyState'
import { getOccupancyData, getOccupancyKPIs } from '@/lib/report-queries'
import { DateRangeState, ComparisonState, OccupancyData } from '@/types/reports'
import { cn } from '@/lib/utils'

export default function OccupancyReportPage() {
  const { orgId } = useAuth()
  const { currentOrg } = useOrgStore()
  const [loading, setLoading] = useState(true)
  
  // State for Filters
  const [dateRange, setDateRange] = useState<DateRangeState>({
    preset: 'last_12_months',
    startDate: subMonths(new Date(), 12).toISOString(),
    endDate: new Date().toISOString()
  })
  const [comparison, setComparison] = useState<ComparisonState>({
    enabled: false,
    type: 'previous_period'
  })

  // State for Data
  const [occupancyData, setOccupancyData] = useState<{ current: OccupancyData[], comparison?: OccupancyData[] } | null>(null)
  const [kpis, setKpis] = useState<any>(null)

  const fetchData = useCallback(async () => {
    if (!orgId || !currentOrg) return
    setLoading(true)
    try {
      const [data, kpiData] = await Promise.all([
        getOccupancyData(
          orgId,
          dateRange.startDate,
          dateRange.endDate,
          comparison.enabled ? comparison.startDate : undefined,
          comparison.enabled ? comparison.endDate : undefined
        ),
        getOccupancyKPIs(
          orgId,
          currentOrg.property_type === 'commercial' ? 'commercial' : 'residential',
          dateRange.startDate,
          dateRange.endDate,
          comparison.enabled ? comparison.startDate : undefined,
          comparison.enabled ? comparison.endDate : undefined
        )
      ])
      setOccupancyData(data)
      setKpis(kpiData)
    } catch (error) {
      console.error('Error fetching occupancy data:', error)
    } finally {
      setLoading(false)
    }
  }, [orgId, currentOrg, dateRange, comparison])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!currentOrg) return null

  const isCommercial = currentOrg.property_type === 'commercial'

  // Prepare Chart Data
  const months = eachMonthOfInterval({
    start: new Date(dateRange.startDate),
    end: new Date(dateRange.endDate)
  })

  const chartData = months.map(month => {
    const monthStr = format(month, 'MMM')
    const currentUnitsInMonth = occupancyData?.current.filter(u => isSameMonth(new Date(u.created_at), month)) || []
    const occupiedUnits = currentUnitsInMonth.filter(u => u.status === 'occupied').length
    const totalUnits = currentUnitsInMonth.length
    
    const rate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
    
    return {
      month: monthStr,
      rate: Math.round(rate) || 0
    }
  })

  // Building Bar Chart Data
  const buildingsMap: Record<string, { occupied: number; vacant: number }> = {}
  occupancyData?.current.forEach(u => {
    if (!buildingsMap[u.building_name]) {
      buildingsMap[u.building_name] = { occupied: 0, vacant: 0 }
    }
    if (u.status === 'occupied') buildingsMap[u.building_name].occupied++
    else buildingsMap[u.building_name].vacant++
  })
  const buildingData = Object.entries(buildingsMap).map(([name, stats]) => ({
    name,
    ...stats
  }))

  const longestVacant = occupancyData?.current
    .filter(u => u.status === 'vacant')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4">
                <ArrowLeft className="h-4 w-4" /> Back to Reports
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isCommercial ? 'Space Utilization' : 'Occupancy Analytics'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">Real-time portfolio availability and trends</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker onRangeChange={setDateRange} initialRange={dateRange} />
              <CompareToggle currentRange={dateRange} onCompareChange={setComparison} />
              <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95">
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'avgRate', label: 'Average Occupancy', icon: LayoutPanelLeft, colorClass: 'bg-teal-50 text-teal-600' },
            { key: 'avgVacancyDuration', label: 'Vacancy Duration', icon: Clock, colorClass: 'bg-amber-50 text-amber-600' },
            { key: 'projectedRate', label: 'Projected Rate', icon: Search, colorClass: 'bg-indigo-50 text-indigo-600' }
          ].map((item, i) => (
            <div key={item.key} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    {item.label}
                  </p>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        {item.key === 'avgRate' ? `${Math.round(kpis?.avgRate?.current || 0)}%` : 
                         item.key === 'avgVacancyDuration' ? `${Math.round(kpis?.avgVacancyDuration?.current || 0)} d` : 
                         `${Math.round(kpis?.projectedRate?.current || 0)}%`}
                      </h3>
                      <AnimatePresence>
                        {comparison.enabled && kpis?.[item.key]?.delta !== undefined && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex items-center gap-1 text-xs font-bold mt-2 px-2 py-1 rounded-lg w-fit",
                              kpis[item.key].isImprovement ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                            )}
                          >
                            {kpis[item.key].isImprovement ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(Math.round(kpis[item.key].delta))}%
                            <span className="text-[10px] opacity-60 ml-1 font-medium">vs prev</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      item.colorClass
                    )}>
                      <item.icon className="h-6 w-6" />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Main Chart */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Occupancy Trend</h3>
              <p className="text-sm text-slate-500">Historical performance over the selected period</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
              <Info className="h-3 w-3" />
              Real-time sync active
            </div>
          </div>

          <div className="h-[350px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : chartData.length === 0 || chartData.every(d => d.rate === 0) ? (
              <EmptyState 
                icon={BarChart2} 
                title="No occupancy data" 
                description="Try expanding your date range or adding more properties to your portfolio." 
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                    dy={15} 
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                    tickFormatter={(v) => `${v}%`} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px'
                    }}
                    cursor={{ stroke: '#14b8a6', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#14b8a6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                    activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 3 }} 
                    isAnimationActive={true} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* By Building */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">By Building</h3>
            <div className="h-[300px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : buildingData.length === 0 ? (
                <EmptyState 
                  icon={Building2} 
                  title="No building data" 
                  description="Add buildings to your portfolio to see detailed occupancy stats." 
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buildingData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} width={100} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Bar dataKey="occupied" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} name="Occupied" isAnimationActive={true} barSize={20} />
                    <Bar dataKey="vacant" stackId="a" fill="#f1f5f9" radius={[0, 6, 6, 0]} name="Vacant" isAnimationActive={true} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Longest Vacant */}
          <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden flex flex-col shadow-sm">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Longest Vacant Units</h3>
              <p className="text-sm text-slate-500 mt-1">Units requiring immediate attention</p>
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : longestVacant?.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8">
                  <p className="text-sm text-slate-400 font-medium italic">All units are currently occupied.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-8 py-4 text-left font-bold text-slate-400 text-[10px] uppercase tracking-widest">Unit & Building</th>
                      <th className="px-8 py-4 text-left font-bold text-slate-400 text-[10px] uppercase tracking-widest">Days Vacant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {longestVacant?.map((u, i) => {
                      const days = Math.floor((new Date().getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24))
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{u.id.substring(0, 8)}</p>
                            <p className="text-xs text-slate-400 font-medium">{u.building_name}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm",
                              days > 90 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                            )}>
                              <Clock className="h-3 w-3" /> {days} days
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
