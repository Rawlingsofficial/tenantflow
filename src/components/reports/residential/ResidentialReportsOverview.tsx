'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/ui/kpi-card'
import { RevenueChart } from '@/components/reports/RevenueChart'
import {
  TrendingUp, Building2, Users, FileText,
  DollarSign, AlertCircle, ChevronRight,
  CheckCircle2, Clock, Home,
} from 'lucide-react'
import { format, subMonths, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

function ReportNavCard({
  title, sub, stat, statLabel, href, accent, icon: Icon, router,
}: {
  title: string; sub: string; stat: string; statLabel: string
  href: string; accent: string; icon: React.ComponentType<{ className?: string }>
  router: ReturnType<typeof useRouter>
}) {
  const cfg: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600', border: 'hover:border-emerald-200' },
    blue:    { bg: 'bg-blue-50',     text: 'text-blue-600',    border: 'hover:border-blue-200' },
    violet:  { bg: 'bg-violet-50',   text: 'text-violet-600',  border: 'hover:border-violet-200' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-600',   border: 'hover:border-amber-200' },
  }
  const c = cfg[accent] ?? cfg.emerald
  return (
    <button onClick={() => router.push(href)}
      className={`bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 text-left
        transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] ${c.border} group w-full`}>
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        <Icon className={`h-4 w-4 ${c.text}`} />
      </div>
      <p className="text-[13px] font-bold text-gray-900 leading-tight">{title}</p>
      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{sub}</p>
      <div className="flex items-end justify-between mt-4 pt-3.5 border-t border-gray-50">
        <div>
          <p className={`text-xl font-bold ${c.text}`}>{stat}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{statLabel}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors mb-0.5" />
      </div>
    </button>
  )
}

export default function ResidentialReportsOverview() {
  const { orgId, getToken } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!orgId) return
      setLoading(true)
      try {
        const token = await getToken({ template: 'supabase' })
        const supabase = getSupabaseBrowserClient(token ?? undefined)
        const d = await loadPortfolioData(supabase, orgId)
        setData(d)
      } catch (err) {
        console.error('Error loading portfolio data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId, getToken])

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 space-y-4">
      <Skeleton className="h-10 w-56 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const totalUnits = data.units.length
  const occupiedUnits = data.units.filter(u => u.status === 'occupied').length
  const vacantUnits = data.units.filter(u => u.status === 'vacant').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  const activeLeases = data.leases.filter(l => l.status === 'active')
  const monthlyRunRate = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const portfolioValue = data.units.reduce((s, u) => s + Number(u.default_rent ?? 0), 0)

  const completedPayments = data.payments.filter(p => p.status === 'completed')
  const collectedThisMonth = completedPayments.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const collectedLastMonth = completedPayments.filter(p => p.payment_date?.startsWith(lastMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const revTrend = collectedLastMonth > 0 ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100) : 0
  const collectionRate = monthlyRunRate > 0 ? Math.round((collectedThisMonth / monthlyRunRate) * 100) : 0

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const value = completedPayments.filter(p => p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), month: ms, value }
  })
  const avgMonthly = Math.round(chartData.reduce((s, d) => s + d.value, 0) / 12)

  const buildingStats = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bOccupied = bUnits.filter(u => u.status === 'occupied').length
    const bMonthly = data.leases.filter(l => l.status === 'active' && bUnits.some(u => u.id === l.unit_id)).reduce((s, l) => s + Number(l.rent_amount), 0)
    const bLeaseIds = data.leases.filter(l => bUnits.some(u => u.id === l.unit_id)).map(l => l.id)
    const bCollected = completedPayments.filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
    return {
      ...b, total: bUnits.length, occupied: bOccupied, monthly: bMonthly, collected: bCollected,
      occupancyPct: bUnits.length > 0 ? Math.round((bOccupied / bUnits.length) * 100) : 0,
      rate: bMonthly > 0 ? Math.round((bCollected / bMonthly) * 100) : 0,
    }
  }).sort((a, b) => b.monthly - a.monthly)

  const expiredLeases = activeLeases.filter(l => l.lease_end && differenceInDays(new Date(l.lease_end), now) < 0)
  const unpaidThisMonth = activeLeases.filter(l =>
    !data.payments.some(p => p.lease_id === l.id && p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
  )

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-14">
      {/* Header */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <p className="text-[10px] font-semibold tracking-widest text-emerald-600 uppercase">Residential Portfolio</p>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Reports</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">{format(now, 'MMMM yyyy')} · {data.buildings.length} buildings · {totalUnits} units</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Monthly run rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">${monthlyRunRate.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Alert strip */}
      {(expiredLeases.length > 0 || unpaidThisMonth.length > 0) && (
        <div className="px-6 mb-4 space-y-2">
          {expiredLeases.length > 0 && (
            <div onClick={() => router.push('/leases')}
              className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[12px] cursor-pointer hover:bg-red-100 transition-colors">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              <span className="text-red-700"><strong>{expiredLeases.length}</strong> lease{expiredLeases.length > 1 ? 's' : ''} expired but still active</span>
              <ChevronRight className="h-3.5 w-3.5 text-red-400 ml-auto" />
            </div>
          )}
          {unpaidThisMonth.length > 0 && (
            <div onClick={() => router.push('/leases/rent-tracker')}
              className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-[12px] cursor-pointer hover:bg-amber-100 transition-colors">
              <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-amber-700"><strong>{unpaidThisMonth.length}</strong> tenant{unpaidThisMonth.length > 1 ? 's' : ''} haven't paid this month</span>
              <ChevronRight className="h-3.5 w-3.5 text-amber-400 ml-auto" />
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Portfolio Value" value={`$${portfolioValue.toLocaleString()}`}
          sub="total default rent capacity" accent="gray" icon={Building2} />
        <KpiCard label="Monthly Run Rate" value={`$${monthlyRunRate.toLocaleString()}`}
          sub={`${activeLeases.length} active leases`} accent="blue" icon={TrendingUp} />
        <KpiCard label="Collection Rate" value={`${collectionRate}%`}
          sub={`$${collectedThisMonth.toLocaleString()} of $${monthlyRunRate.toLocaleString()}`}
          accent={collectionRate >= 90 ? 'emerald' : 'amber'} icon={CheckCircle2}
          trend={{ value: revTrend, label: 'vs last month' }} />
        <KpiCard label="Occupancy Rate" value={`${occupancyRate}%`}
          sub={`${occupiedUnits} of ${totalUnits} units`}
          accent={occupancyRate >= 80 ? 'emerald' : 'amber'} icon={Home} />
      </div>

      {/* Report nav cards */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        <ReportNavCard title="Revenue" sub="Collections, outstanding & trends"
          stat={`$${collectedThisMonth.toLocaleString()}`} statLabel="collected this month"
          href="/reports/revenue" accent="emerald" icon={DollarSign} router={router} />
        <ReportNavCard title="Occupancy" sub="Vacancies, turnaround & health"
          stat={`${occupancyRate}%`} statLabel="occupied"
          href="/reports/occupancy" accent="blue" icon={Home} router={router} />
        <ReportNavCard title="Tenants" sub="Payment habits & reliability"
          stat={`${data.tenants.filter(t => t.status === 'active').length}`} statLabel="active"
          href="/reports/tenants" accent="violet" icon={Users} router={router} />
        <ReportNavCard title="Lease Health" sub="Expirations, renewals & rent"
          stat={`${activeLeases.length}`} statLabel="active leases"
          href="/reports/leases" accent="amber" icon={FileText} router={router} />
      </div>

      {/* Revenue chart */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[13px] font-bold text-gray-900">Revenue — Last 12 Months</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Collected per month · avg ${avgMonthly.toLocaleString()}/mo</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600">
                ${completedPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400">all-time collected</p>
            </div>
          </div>
          <RevenueChart data={chartData} currentMonth={thisMonth} variant="light" height={120} showAvg />
        </div>
      </div>

      {/* Building breakdown */}
      {buildingStats.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-gray-900">Building Breakdown</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{data.buildings.length} properties · {format(now, 'MMMM yyyy')}</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/40">
                  {['Building', 'Units', 'Occupancy', 'Monthly', 'Collected', 'Rate', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold tracking-wider text-gray-400 uppercase first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildingStats.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push('/reports/occupancy')}>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-semibold text-gray-900">{b.name}</p>
                      {b.address && <p className="text-[10px] text-gray-400 mt-0.5">{b.address}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-medium text-gray-700">{b.total}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${b.occupancyPct}%`, backgroundColor: b.occupancyPct >= 80 ? '#059669' : b.occupancyPct >= 60 ? '#d97706' : '#ef4444' }} />
                        </div>
                        <span className={`text-[11px] font-bold ${b.occupancyPct >= 80 ? 'text-emerald-600' : b.occupancyPct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {b.occupancyPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-800">${b.monthly.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-emerald-600">${b.collected.toLocaleString()}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${b.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : b.rate >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                        {b.rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><ChevronRight className="h-4 w-4 text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50">
                  <td className="px-5 py-2.5 text-[11px] font-semibold text-gray-500">Total</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-700">{totalUnits}</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-emerald-600">{occupancyRate}%</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-700">${monthlyRunRate.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-emerald-600">${collectedThisMonth.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-700">{collectionRate}%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Vacancy snapshot */}
      {vacantUnits > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-gray-900">Vacancy Snapshot</p>
              <button onClick={() => router.push('/reports/occupancy')} className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700">
                Full report <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Vacant Units', value: vacantUnits, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Maintenance', value: data.units.filter(u => u.status === 'maintenance').length, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Occupancy', value: `${occupancyRate}%`, color: occupancyRate >= 80 ? 'text-emerald-600' : 'text-amber-600', bg: occupancyRate >= 80 ? 'bg-emerald-50' : 'bg-amber-50' },
              ].map(k => (
                <div key={k.label} className={`${k.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
