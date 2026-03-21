'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp, Building2, Users, FileText,
  DollarSign, AlertCircle, ChevronRight,
  CheckCircle2, Clock, BarChart2, Home
} from 'lucide-react'
import { format, subMonths, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

export default function ReportsOverview() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadPortfolioData(supabase, orgId).then(d => { setData(d); setLoading(false) })
  }, [orgId])

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )

  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')

  // ── KPIs ──
  const totalUnits = data.units.length
  const occupiedUnits = data.units.filter(u => u.status === 'occupied').length
  const vacantUnits = data.units.filter(u => u.status === 'vacant').length
  const maintenanceUnits = data.units.filter(u => u.status === 'maintenance').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  const activeLeases = data.leases.filter(l => l.status === 'active')
  const monthlyRunRate = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)

  const portfolioValue = data.units.reduce((s, u) => s + Number(u.default_rent ?? 0), 0)

  const completedPayments = data.payments.filter(p => p.status === 'completed')
  const collectedThisMonth = completedPayments
    .filter(p => p.payment_date?.startsWith(thisMonth))
    .reduce((s, p) => s + Number(p.amount), 0)
  const collectionRate = monthlyRunRate > 0 ? Math.round((collectedThisMonth / monthlyRunRate) * 100) : 0

  // ── 12-month revenue chart ──
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const collected = completedPayments
      .filter(p => p.payment_date?.startsWith(ms))
      .reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), short: format(m, 'MMM'), value: collected, month: ms }
  })
  const maxRevenue = Math.max(...months12.map(m => m.value), 1)

  // ── Building breakdown ──
  const buildingStats = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bOccupied = bUnits.filter(u => u.status === 'occupied').length
    const bLeaseIds = data.leases.filter(l => bUnits.some(u => u.id === l.unit_id)).map(l => l.id)
    const bMonthly = data.leases
      .filter(l => l.status === 'active' && bUnits.some(u => u.id === l.unit_id))
      .reduce((s, l) => s + Number(l.rent_amount), 0)
    const bCollected = completedPayments
      .filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth))
      .reduce((s, p) => s + Number(p.amount), 0)
    const bRate = bOccupied > 0 && bMonthly > 0 ? Math.round((bCollected / bMonthly) * 100) : 0
    return {
      ...b,
      total: bUnits.length,
      occupied: bOccupied,
      vacant: bUnits.filter(u => u.status === 'vacant').length,
      monthly: bMonthly,
      collected: bCollected,
      rate: bRate,
      occupancyPct: bUnits.length > 0 ? Math.round((bOccupied / bUnits.length) * 100) : 0,
    }
  }).sort((a, b) => b.monthly - a.monthly)

  // ── Alerts ──
  const expiredLeases = activeLeases.filter(l => l.lease_end && differenceInDays(new Date(l.lease_end), now) < 0)
  const expiringSoon = activeLeases.filter(l => {
    if (!l.lease_end) return false
    const d = differenceInDays(new Date(l.lease_end), now)
    return d >= 0 && d <= 30
  })
  const unpaidThisMonth = activeLeases.filter(l => {
    const pays = data.payments.filter(p => p.lease_id === l.id && p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
    return pays.length === 0
  })

  const reportCards = [
    {
      title: 'Revenue', subtitle: 'Collections, outstanding, trends',
      icon: DollarSign, color: 'emerald',
      stat: `$${collectedThisMonth.toLocaleString()}`, statLabel: 'this month',
      href: '/reports/revenue',
    },
    {
      title: 'Occupancy', subtitle: 'Vacancies, turnaround, unit health',
      icon: Home, color: 'blue',
      stat: `${occupancyRate}%`, statLabel: 'occupied',
      href: '/reports/occupancy',
    },
    {
      title: 'Tenants', subtitle: 'Payment habits, tenure, reliability',
      icon: Users, color: 'violet',
      stat: `${data.tenants.filter(t => t.status === 'active').length}`, statLabel: 'active',
      href: '/reports/tenants',
    },
    {
      title: 'Lease Health', subtitle: 'Expirations, renewals, rent analysis',
      icon: FileText, color: 'amber',
      stat: `${activeLeases.length}`, statLabel: 'active leases',
      href: '/reports/leases',
    },
  ]

  const colorMap: Record<string, { bg: string; text: string; light: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', bar: '#059669' },
    blue: { bg: 'bg-blue-600', text: 'text-blue-700', light: 'bg-blue-50', bar: '#2563eb' },
    violet: { bg: 'bg-violet-600', text: 'text-violet-700', light: 'bg-violet-50', bar: '#7c3aed' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', bar: '#d97706' },
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Portfolio intelligence — {format(now, 'MMMM yyyy')}</p>
      </div>

      {/* Alert strip */}
      {(expiredLeases.length > 0 || unpaidThisMonth.length > 0) && (
        <div className="px-6 mb-4 space-y-2">
          {expiredLeases.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => router.push('/leases/expirations')}>
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-red-800"><strong>{expiredLeases.length}</strong> lease{expiredLeases.length > 1 ? 's' : ''} expired but still active — action needed</span>
              <ChevronRight className="h-4 w-4 text-red-400 ml-auto" />
            </div>
          )}
          {unpaidThisMonth.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => router.push('/leases/rent-tracker')}>
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-amber-800"><strong>{unpaidThisMonth.length}</strong> tenant{unpaidThisMonth.length > 1 ? 's' : ''} haven't paid this month</span>
              <ChevronRight className="h-4 w-4 text-amber-400 ml-auto" />
            </div>
          )}
        </div>
      )}

      {/* Top 4 KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          {
            label: 'Portfolio Value', value: `$${portfolioValue.toLocaleString()}`,
            sub: 'total default rent capacity', icon: Building2, color: 'text-gray-700'
          },
          {
            label: 'Monthly Run Rate', value: `$${monthlyRunRate.toLocaleString()}`,
            sub: `${activeLeases.length} active leases`, icon: TrendingUp, color: 'text-emerald-600'
          },
          {
            label: 'Collection Rate', value: `${collectionRate}%`,
            sub: `$${collectedThisMonth.toLocaleString()} of $${monthlyRunRate.toLocaleString()}`,
            icon: CheckCircle2,
            color: collectionRate >= 90 ? 'text-emerald-600' : collectionRate >= 70 ? 'text-amber-600' : 'text-red-500'
          },
          {
            label: 'Occupancy Rate', value: `${occupancyRate}%`,
            sub: `${occupiedUnits} of ${totalUnits} units`,
            icon: Home,
            color: occupancyRate >= 80 ? 'text-emerald-600' : occupancyRate >= 60 ? 'text-amber-600' : 'text-red-500'
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
            <div className="flex items-start justify-between">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{kpi.label}</p>
              <kpi.icon className="h-4 w-4 text-gray-300" />
            </div>
            <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* 4 Report nav cards */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {reportCards.map(card => {
          const c = colorMap[card.color]
          return (
            <button key={card.title} onClick={() => router.push(card.href)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all group">
              <div className={`w-9 h-9 rounded-xl ${c.light} flex items-center justify-center mb-3`}>
                <card.icon className={`h-4.5 w-4.5 ${c.text}`} />
              </div>
              <p className="text-sm font-bold text-gray-900">{card.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{card.subtitle}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span>
                  <span className={`text-lg font-bold ${c.text}`}>{card.stat}</span>
                  <span className="text-xs text-gray-400 ml-1">{card.statLabel}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </button>
          )
        })}
      </div>

      {/* 12-month revenue chart */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-900">Revenue — Last 12 Months</p>
              <p className="text-xs text-gray-400 mt-0.5">Actual rent collected per month</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-emerald-600">
                ${completedPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">all time collected</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-28">
            {months12.map((m, i) => {
              const h = maxRevenue > 0 ? (m.value / maxRevenue) * 100 : 0
              const isCurrent = m.month === thisMonth
              const isHighest = m.value === Math.max(...months12.map(x => x.value))
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {m.value > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      ${m.value.toLocaleString()}
                    </div>
                  )}
                  <div className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(h, m.value > 0 ? 6 : 2)}%`,
                      background: isCurrent ? 'linear-gradient(to top, #059669, #34d399)' :
                        isHighest ? 'linear-gradient(to top, #047857, #10b981)' :
                        'linear-gradient(to top, #a7f3d0, #d1fae5)',
                      minHeight: '3px',
                      opacity: m.value === 0 ? 0.25 : 1,
                    }} />
                  <p className="text-[9px] text-gray-400">{m.short}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Building breakdown table */}
      {buildingStats.length > 0 && (
        <div className="px-6 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Building Breakdown</p>
                <p className="text-xs text-gray-400">{data.buildings.length} properties · {format(now, 'MMMM yyyy')}</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Building', 'Units', 'Occupancy', 'Monthly Rent', 'Collected', 'Rate', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildingStats.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push('/reports/occupancy')}>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      {b.address && <p className="text-[11px] text-gray-400">{b.address}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">{b.total}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${b.occupancyPct}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${b.occupancyPct >= 80 ? 'text-emerald-600' : b.occupancyPct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {b.occupancyPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-800">${b.monthly.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-emerald-600">${b.collected.toLocaleString()}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        b.rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                        b.rate >= 70 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-600'
                      }`}>{b.rate}%</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50">
                  <td className="px-5 py-2.5 text-xs font-semibold text-gray-500">Total</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{totalUnits}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">{occupancyRate}%</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">${monthlyRunRate.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">${collectedThisMonth.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{collectionRate}%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


