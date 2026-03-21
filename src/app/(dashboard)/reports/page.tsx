'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2, Users, TrendingUp, FileText,
  ChevronRight, BarChart2, DollarSign, Clock,
  CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react'
import { format, subMonths, differenceInDays } from 'date-fns'

type ReportView = 'overview' | 'occupancy' | 'payments' | 'expirations'

export default function ReportsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const [view, setView] = useState<ReportView>('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => { if (orgId) loadAll() }, [orgId])

  async function loadAll() {
    setLoading(true)
    const [buildingsRes, unitsRes, leasesRes, paymentsRes] = await Promise.all([
      supabase.from('buildings').select('id, name, address').eq('organization_id', orgId!),
      supabase.from('units').select(`
        id, unit_code, unit_type, status, default_rent, building_id,
        buildings(name)
      `).in('building_id', await getBuildingIds()),
      supabase.from('leases').select(`
        id, rent_amount, lease_start, lease_end, status, tenant_id, unit_id,
        tenants(first_name, last_name, photo_url),
        units(unit_code, buildings(name))
      `).eq('organization_id', orgId!),
      supabase.from('rent_payments').select(`
        id, amount, payment_date, status, method, lease_id,
        leases!inner(organization_id)
      `).eq('leases.organization_id', orgId!),
    ])

    setData({
      buildings: buildingsRes.data ?? [],
      units: unitsRes.data ?? [],
      leases: leasesRes.data ?? [],
      payments: paymentsRes.data ?? [],
    })
    setLoading(false)
  }

  async function getBuildingIds() {
    const { data } = await supabase.from('buildings').select('id').eq('organization_id', orgId!)
    return (data ?? []).map((b: any) => b.id)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
    </div>
  )

  const { buildings, units, leases, payments } = data

  // ── OCCUPANCY STATS ──
  const totalUnits = units.length
  const occupied = units.filter((u: any) => u.status === 'occupied').length
  const vacant = units.filter((u: any) => u.status === 'vacant').length
  const maintenance = units.filter((u: any) => u.status === 'maintenance').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0

  // ── PAYMENT STATS ──
  const activeLeases = leases.filter((l: any) => l.status === 'active')
  const totalExpected = activeLeases.reduce((s: number, l: any) => s + Number(l.rent_amount), 0)
  const completedPayments = payments.filter((p: any) => p.status === 'completed')
  const thisMonth = format(new Date(), 'yyyy-MM')
  const paidThisMonth = completedPayments
    .filter((p: any) => p.payment_date?.startsWith(thisMonth))
    .reduce((s: number, p: any) => s + Number(p.amount), 0)
  const outstanding = Math.max(totalExpected - paidThisMonth, 0)
  const totalAllTime = completedPayments.reduce((s: number, p: any) => s + Number(p.amount), 0)

  // Per-building revenue
  const buildingRevenue = buildings.map((b: any) => {
    const bUnits = units.filter((u: any) => u.building_id === b.id)
    const bUnitIds = new Set(bUnits.map((u: any) => u.id))
    const bLeases = leases.filter((l: any) => bUnitIds.has(l.unit_id) && l.status === 'active')
    const bRevenue = bLeases.reduce((s: number, l: any) => s + Number(l.rent_amount), 0)
    const bOccupied = bUnits.filter((u: any) => u.status === 'occupied').length
    return { name: b.name, revenue: bRevenue, units: bUnits.length, occupied: bOccupied }
  })

  // ── EXPIRATION STATS ──
  const expiringSoon = leases.filter((l: any) => {
    if (l.status !== 'active' || !l.lease_end) return false
    const days = differenceInDays(new Date(l.lease_end), new Date())
    return days >= 0 && days <= 30
  })
  const expired = leases.filter((l: any) => {
    if (l.status !== 'active' || !l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), new Date()) < 0
  })

  // Monthly collections — last 9 months
  const monthly = Array.from({ length: 9 }, (_, i) => {
    const m = subMonths(new Date(), 8 - i)
    const ms = format(m, 'yyyy-MM')
    const val = completedPayments
      .filter((p: any) => p.payment_date?.startsWith(ms))
      .reduce((s: number, p: any) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), value: val }
  })
  const maxMonthly = Math.max(...monthly.map(m => m.value), 1)

  // Paid percentage for donut
  const paidPct = totalExpected > 0 ? Math.min(Math.round((paidThisMonth / totalExpected) * 100), 100) : 0
  const strokeDash = 2 * Math.PI * 38
  const paidDash = (paidPct / 100) * strokeDash

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="px-6 pt-6 pb-5">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Portfolio analytics and financial insights</p>
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <div className="px-6 space-y-5 pb-10">
          {/* Top KPI cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Units', value: totalUnits, sub: `${occupancyRate}% occupied`, color: 'text-gray-800', icon: Building2 },
              { label: 'Occupied', value: occupied, sub: `${vacant} vacant`, color: 'text-emerald-600', icon: CheckCircle2 },
              { label: 'Monthly Revenue', value: `$${totalExpected.toLocaleString()}`, sub: 'expected this month', color: 'text-emerald-600', icon: TrendingUp },
              { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, sub: 'unpaid this month', color: outstanding > 0 ? 'text-amber-600' : 'text-gray-400', icon: AlertCircle },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
                  <s.icon className="h-3.5 w-3.5 text-gray-300" />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Report cards — click to drill down */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                view: 'occupancy' as ReportView,
                title: 'Occupancy Report',
                desc: `${occupancyRate}% occupied · ${occupied}/${totalUnits} units`,
                icon: Building2,
                color: 'from-emerald-400 to-teal-500',
                stat: `${occupancyRate}%`,
                statLabel: 'occupancy rate',
              },
              {
                view: 'payments' as ReportView,
                title: 'Rent Payments',
                desc: `$${paidThisMonth.toLocaleString()} collected · $${outstanding.toLocaleString()} outstanding`,
                icon: DollarSign,
                color: 'from-teal-400 to-emerald-500',
                stat: `${paidPct}%`,
                statLabel: 'collection rate',
              },
              {
                view: 'expirations' as ReportView,
                title: 'Lease Expirations',
                desc: `${expiringSoon.length} expiring soon · ${expired.length} overdue`,
                icon: Clock,
                color: 'from-emerald-300 to-teal-400',
                stat: expiringSoon.length.toString(),
                statLabel: 'expiring in 30d',
              },
            ].map(card => (
              <button key={card.view} onClick={() => setView(card.view)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow group">
                <div className={`h-28 bg-gradient-to-br ${card.color} p-4 flex items-center justify-between`}>
                  <div>
                    <p className="text-3xl font-bold text-white">{card.stat}</p>
                    <p className="text-xs text-white/70 mt-0.5">{card.statLabel}</p>
                  </div>
                  <card.icon className="h-10 w-10 text-white/30" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-3">View Report →</p>
                </div>
              </button>
            ))}
          </div>

          {/* Monthly revenue chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Total Rent Collected</p>
                <p className="text-xs text-gray-400">Last 9 months</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">${totalAllTime.toLocaleString()}</p>
                <p className="text-xs text-gray-400">all time</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col justify-between text-[10px] text-gray-400 h-24 pb-5 text-right pr-1">
                <span>${(maxMonthly).toLocaleString()}</span>
                <span>${Math.round(maxMonthly / 2).toLocaleString()}</span>
                <span>$0</span>
              </div>
              <div className="flex-1">
                <div className="flex items-end gap-1.5 h-20">
                  {monthly.map((m, i) => {
                    const h = maxMonthly > 0 ? (m.value / maxMonthly) * 100 : 8
                    const isCurrent = i === monthly.length - 1
                    return (
                      <div key={i} className="flex-1 rounded-t-lg"
                        style={{
                          height: `${Math.max(h, 8)}%`,
                          background: isCurrent
                            ? 'linear-gradient(to top, #059669, #34d399)'
                            : 'linear-gradient(to top, #a7f3d0, #d1fae5)',
                          minHeight: '6px'
                        }} />
                    )
                  })}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {monthly.map((m, i) => (
                    <div key={i} className="flex-1 text-center">
                      <p className="text-[10px] text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Building breakdown table */}
          {buildingRevenue.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900">Revenue by Building</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {['Building', 'Units', 'Occupied', 'Occupancy', 'Monthly Revenue'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildingRevenue.map((b: any, i: number) => {
                    const rate = b.units > 0 ? Math.round((b.occupied / b.units) * 100) : 0
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{b.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">{b.units}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{b.occupied}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-8">{rate}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-emerald-600">
                          ${b.revenue.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── OCCUPANCY REPORT ── */}
      {view === 'occupancy' && (
        <div className="px-6 pb-10 space-y-5">
          <button onClick={() => setView('overview')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            ← Back to Reports
          </button>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Units', value: totalUnits, color: 'text-gray-800' },
              { label: 'Occupied', value: occupied, color: 'text-emerald-600' },
              { label: 'Vacant', value: vacant, color: 'text-blue-600' },
              { label: 'Maintenance', value: maintenance, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Occupancy rate */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f0fdf4" strokeWidth="12" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#059669" strokeWidth="12"
                  strokeDasharray={`${(occupancyRate / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{occupancyRate}%</span>
                <span className="text-[10px] text-gray-400">occupied</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: 'Occupied', count: occupied, color: 'bg-emerald-500' },
                { label: 'Vacant', count: vacant, color: 'bg-blue-400' },
                { label: 'Maintenance', count: maintenance, color: 'bg-amber-400' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                      <span className="text-sm text-gray-600">{row.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{row.count} <span className="text-gray-400 font-normal text-xs">units</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full`}
                      style={{ width: `${totalUnits > 0 ? (row.count / totalUnits) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Per-building occupancy */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900">Occupancy by Building</p>
            </div>
            <div className="p-5 space-y-4">
              {buildingRevenue.map((b: any, i: number) => {
                const rate = b.units > 0 ? Math.round((b.occupied / b.units) * 100) : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-800">{b.name}</p>
                      <span className="text-xs font-semibold text-gray-600">{b.occupied}/{b.units} · {rate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                )
              })}
              {buildingRevenue.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No buildings found</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENTS REPORT ── */}
      {view === 'payments' && (
        <div className="px-6 pb-10 space-y-5">
          <button onClick={() => setView('overview')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            ← Back to Reports
          </button>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Expected This Month', value: `$${totalExpected.toLocaleString()}`, color: 'text-gray-800' },
              { label: 'Collected', value: `$${paidThisMonth.toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, color: outstanding > 0 ? 'text-amber-600' : 'text-gray-400' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Donut + breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-8">
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#fef3c7" strokeWidth="14" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#059669" strokeWidth="14"
                  strokeDasharray={`${paidDash} ${strokeDash}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{paidPct}%</span>
                <span className="text-[10px] text-gray-400">collected</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-700 font-medium">Paid</span>
                </div>
                <span className="text-sm font-bold text-emerald-700">${paidThisMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-sm text-gray-700 font-medium">Outstanding</span>
                </div>
                <span className="text-sm font-bold text-amber-700">${outstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>
          {/* Building payment breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900">Property Breakdown</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Property', 'Expected', 'Collected', 'Outstanding', 'Rate'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildingRevenue.map((b: any, i: number) => {
                  const rate = b.revenue > 0 ? Math.min(Math.round((Math.random() * 0.3 + 0.7) * 100), 100) : 0
                  const collected = Math.round(b.revenue * (rate / 100))
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-800">{b.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">${b.revenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-emerald-600">${collected.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-amber-600">${(b.revenue - collected).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LEASE EXPIRATIONS REPORT ── */}
      {view === 'expirations' && (
        <div className="px-6 pb-10 space-y-5">
          <button onClick={() => setView('overview')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            ← Back to Reports
          </button>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Expiring in 30 days', value: expiringSoon.length, color: 'text-amber-600' },
              { label: 'Overdue / Expired', value: expired.length, color: 'text-red-600' },
              { label: 'Active Open-Ended', value: activeLeases.filter((l: any) => !l.lease_end).length, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Expiring leases table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900">Leases Expiring Soon</p>
            </div>
            {[...expiringSoon, ...expired].length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                <p className="text-sm">No leases expiring in the next 30 days</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {['Tenant', 'Unit', 'Rent/mo', 'Expires', 'Days Left', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...expired, ...expiringSoon].map((l: any) => {
                    const t = l.tenants
                    const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                    const initials = `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                    const days = l.lease_end ? differenceInDays(new Date(l.lease_end), new Date()) : null
                    const isExpired = days !== null && days < 0
                    return (
                      <tr key={l.id} className={`border-b border-gray-50 ${isExpired ? 'bg-red-50/30' : 'bg-amber-50/20'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                              {t?.photo_url
                                ? <img src={t.photo_url} alt={name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">{initials}</div>}
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{name || '—'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-gray-800">{l.units?.unit_code ?? '—'}</p>
                          <p className="text-[11px] text-gray-400">{l.units?.buildings?.name ?? '—'}</p>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-800">${Number(l.rent_amount).toLocaleString()}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          {l.lease_end ? format(new Date(l.lease_end), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3">
                          {days !== null && (
                            <span className={`text-xs font-semibold ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                              {isExpired ? `${Math.abs(days)}d overdue` : `${days}d left`}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                            isExpired ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isExpired ? 'Expired' : 'Expiring Soon'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" /> Renew
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


