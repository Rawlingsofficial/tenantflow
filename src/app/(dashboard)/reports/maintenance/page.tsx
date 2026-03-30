//src/app/(dashboard)/reports/maintenance/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { useOrgStore } from '@/store/orgStore'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Wrench, ArrowLeft, ArrowUpRight, ArrowDownRight, 
  Clock, FileSpreadsheet, CheckCircle2, AlertCircle, Timer
} from 'lucide-react'
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar
} from 'recharts'
import Link from 'next/link'
import { subMonths, format, eachMonthOfInterval, isSameMonth } from 'date-fns'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CompareToggle } from '@/components/shared/CompareToggle'
import { EmptyState } from '@/components/shared/EmptyState'
import { getMaintenanceData, getMaintenanceKPIs } from '@/lib/report-queries'
import { DateRangeState, ComparisonState, MaintenanceReportData } from '@/types/reports'
import { cn } from '@/lib/utils'

export default function MaintenanceReportPage() {
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
  const [maintenanceData, setMaintenanceData] = useState<{ current: MaintenanceReportData[], comparison?: MaintenanceReportData[] } | null>(null)
  const [kpis, setKpis] = useState<any>(null)

  const fetchData = useCallback(async () => {
    if (!orgId || !currentOrg) return
    setLoading(true)
    try {
      const [data, kpiData] = await Promise.all([
        getMaintenanceData(
          orgId,
          dateRange.startDate,
          dateRange.endDate,
          comparison.enabled ? comparison.startDate : undefined,
          comparison.enabled ? comparison.endDate : undefined
        ),
        getMaintenanceKPIs(
          orgId,
          dateRange.startDate,
          dateRange.endDate,
          comparison.enabled ? comparison.startDate : undefined,
          comparison.enabled ? comparison.endDate : undefined
        )
      ])
      setMaintenanceData(data)
      setKpis(kpiData)
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }, [orgId, currentOrg, dateRange, comparison])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!currentOrg) return null

  // Prepare Chart Data
  const months = eachMonthOfInterval({
    start: new Date(dateRange.startDate),
    end: new Date(dateRange.endDate)
  })

  const chartData = months.map(month => {
    const monthStr = format(month, 'MMM')
    const currentRequestsInMonth = maintenanceData?.current.filter(m => isSameMonth(new Date(m.created_at), month)) || []
    return {
      month: monthStr,
      requests: currentRequestsInMonth.length,
      resolved: currentRequestsInMonth.filter(m => m.status === 'completed').length
    }
  })

  const kpiCards = [
    {
      id: 'openRequests',
      label: 'Open Requests',
      value: kpis?.openRequests?.current || 0,
      delta: kpis?.openRequests?.delta,
      isImprovement: kpis?.openRequests?.isImprovement,
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-600'
    },
    {
      id: 'avgResolutionTime',
      label: 'Avg Resolution Time',
      value: `${Math.round(kpis?.avgResolutionTime?.current || 0)} d`,
      delta: kpis?.avgResolutionTime?.delta,
      isImprovement: kpis?.avgResolutionTime?.isImprovement,
      icon: Timer,
      color: 'bg-indigo-50 text-indigo-600'
    },
    {
      id: 'completionRate',
      label: 'Completion Rate',
      value: `${Math.round(kpis?.completionRate?.current || 0)}%`,
      delta: kpis?.completionRate?.delta,
      isImprovement: kpis?.completionRate?.isImprovement,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600'
    }
  ]

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
                Maintenance & Capex Analytics
              </h1>
              <p className="text-sm text-slate-500 mt-1">Portfolio health and resolution efficiency</p>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpiCards.map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    {card.label}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        {card.value}
                      </h3>
                      <AnimatePresence>
                        {comparison.enabled && card.delta !== undefined && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex items-center gap-1 text-xs font-bold mt-2 px-2 py-1 rounded-lg w-fit",
                              card.isImprovement ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                            )}
                          >
                            {card.isImprovement ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(Math.round(card.delta))}%
                            <span className="text-[10px] opacity-60 ml-1 font-medium">vs prev</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", card.color)}>
                      <card.icon className="h-6 w-6" />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Requests Chart */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Request Volume & Resolution</h3>
              <p className="text-sm text-slate-500">New requests vs completed tasks</p>
            </div>
          </div>

          <div className="h-[350px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : chartData.length === 0 || chartData.every(d => d.requests === 0) ? (
              <EmptyState 
                icon={Wrench} 
                title="No maintenance data" 
                description="No maintenance requests were found for this period." 
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
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
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#f59e0b" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRequests)" 
                    name="New Requests"
                    isAnimationActive={true} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorResolved)" 
                    name="Resolved"
                    isAnimationActive={true} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Maintenance Log Table */}
        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden flex flex-col shadow-sm">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Activity Log</h3>
              <p className="text-sm text-slate-500 mt-1">Detailed list of recent requests and their status</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : maintenanceData?.current.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-slate-400 font-medium italic text-sm">No maintenance requests found in this period.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Category & Description</th>
                    <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Unit & Building</th>
                    <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">Date Logged</th>
                    <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">Priority</th>
                    <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {maintenanceData?.current.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900 truncate max-w-md">{m.description}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{m.category}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900">{m.unit_code}</p>
                        <p className="text-xs text-slate-400 font-medium">{m.building_name}</p>
                      </td>
                      <td className="px-8 py-5 text-center font-medium text-slate-600">
                        {format(new Date(m.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                          m.priority === 'high' ? "bg-rose-50 text-rose-700" : m.priority === 'medium' ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700"
                        )}>
                          {m.priority}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          m.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
