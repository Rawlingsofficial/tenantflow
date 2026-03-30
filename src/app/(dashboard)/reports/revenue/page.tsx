//src/app/(dashboard)/reports/occupancy/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { useOrgStore } from '@/store/orgStore'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DollarSign, ArrowLeft, ArrowUpRight, ArrowDownRight, CreditCard,
  FileSpreadsheet, BarChart2
} from 'lucide-react'
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ComposedChart, Line
} from 'recharts'
import Link from 'next/link'
import { subMonths, format, isSameMonth, eachMonthOfInterval } from 'date-fns'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CompareToggle } from '@/components/shared/CompareToggle'
import { EmptyState } from '@/components/shared/EmptyState'
import { getResidentialRevenue, getCommercialRevenue, getResidentialKPIs, getCommercialKPIs } from '@/lib/report-queries'
import { DateRangeState, ComparisonState } from '@/types/reports'
import { cn } from '@/lib/utils'

export default function RevenueReportPage() {
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
  const [revenueData, setRevenueData] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)

  const fetchData = useCallback(async () => {
    if (!orgId || !currentOrg) return
    setLoading(true)
    try {
      const isCommercial = currentOrg.property_type === 'commercial'
      const [data, kpiData] = await Promise.all([
        isCommercial 
          ? getCommercialRevenue(
              orgId,
              dateRange.startDate,
              dateRange.endDate,
              comparison.enabled ? comparison.startDate : undefined,
              comparison.enabled ? comparison.endDate : undefined
            )
          : getResidentialRevenue(
              orgId,
              dateRange.startDate,
              dateRange.endDate,
              comparison.enabled ? comparison.startDate : undefined,
              comparison.enabled ? comparison.endDate : undefined
            ),
        isCommercial
          ? getCommercialKPIs(
              orgId,
              dateRange.startDate,
              dateRange.endDate,
              comparison.enabled ? comparison.startDate : undefined,
              comparison.enabled ? comparison.endDate : undefined
            )
          : getResidentialKPIs(
              orgId,
              dateRange.startDate,
              dateRange.endDate,
              comparison.enabled ? comparison.startDate : undefined,
              comparison.enabled ? comparison.endDate : undefined
            )
      ])
      setRevenueData(data)
      setKpis(kpiData)
    } catch (error) {
      console.error('Error fetching revenue data:', error)
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
    let collected = 0
    let expected = 0

    if (isCommercial) {
      const currentInvoices = revenueData?.current.filter((inv: any) => isSameMonth(new Date(inv.invoice_date), month)) || []
      currentInvoices.forEach((inv: any) => {
        if (inv.status === 'paid') collected += inv.total_amount
        expected += inv.total_amount
      })
    } else {
      const currentPayments = revenueData?.current.filter((p: any) => isSameMonth(new Date(p.payment_date), month)) || []
      currentPayments.forEach((p: any) => {
        if (p.status === 'completed') collected += p.amount
        expected += p.rent_amount // Assuming rent_amount is expected
      })
    }

    return {
      month: monthStr,
      collected,
      expected
    }
  })

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isCommercial ? 'Revenue & Yield' : 'Revenue & Rent Analytics'}
            </h1>
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

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              key: isCommercial ? 'totalRevenue' : 'totalRentCollected', 
              label: isCommercial ? 'Total Revenue' : 'Total Rent Collected',
              format: (v: number) => `$${v.toLocaleString()}`
            },
            { 
              key: isCommercial ? 'occupancyRateByArea' : 'occupancyRate', 
              label: 'Occupancy Rate',
              format: (v: number) => `${Math.round(v)}%`
            },
            { 
              key: isCommercial ? 'activeLeasesCount' : 'activeLeasesCount', 
              label: 'Active Leases',
              format: (v: number) => v.toString()
            }
          ].map((item, i) => (
            <motion.div 
              key={item.key}
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }} 
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{item.label}</p>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        {item.format(kpis?.[item.key]?.current || 0)}
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
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-teal-50 text-teal-600">
                      <DollarSign className="h-6 w-6" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {/* 12 Month Trend */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Revenue Collected vs Expected</h3>
              <p className="text-sm text-slate-500">Historical collection performance</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
              <CreditCard className="h-3 w-3" />
              Automated reconciliation
            </div>
          </div>

          <div className="h-[350px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : chartData.length === 0 || chartData.every(d => d.collected === 0 && d.expected === 0) ? (
              <EmptyState 
                icon={BarChart2} 
                title="No revenue data" 
                description="Try expanding your date range or recording payments." 
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="collected" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Collected" isAnimationActive={true} barSize={32} />
                  <Line type="monotone" dataKey="expected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Expected" isAnimationActive={true} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue by Building - Simplified for now as it requires another grouping query or client side logic */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">Top Revenue Sources</h3>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)
              ) : revenueData?.current.length === 0 ? (
                <EmptyState icon={DollarSign} title="No data" description="No revenue recorded for this period." />
              ) : (
                revenueData?.current.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">
                        {isCommercial ? `Invoice ${item.invoice_date}` : `Payment ${item.payment_date}`}
                      </p>
                      <p className="text-xs text-slate-500">{item.status}</p>
                    </div>
                    <p className="text-lg font-black text-teal-600">
                      ${(isCommercial ? item.total_amount : item.amount).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Outstanding Balance Table - Placeholder for now as it requires specific outstanding query */}
          <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden flex flex-col shadow-sm">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Transactions</h3>
              <p className="text-sm text-slate-500 mt-1">Latest billing activity</p>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 text-left font-bold text-slate-400 text-[10px] uppercase tracking-widest">Reference</th>
                    <th className="px-8 py-4 text-left font-bold text-slate-400 text-[10px] uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-right font-bold text-slate-400 text-[10px] uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="px-8 py-4"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                    ))
                  ) : revenueData?.current.length === 0 ? (
                    <tr><td colSpan={3} className="px-8 py-8 text-center text-slate-400 italic">No transactions found</td></tr>
                  ) : (
                    revenueData?.current.slice(0, 5).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-900">{isCommercial ? 'Commercial Inv' : 'Residential Rent'}</td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                            row.status === 'paid' || row.status === 'completed' ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-slate-900">
                          ${(isCommercial ? row.total_amount : row.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
