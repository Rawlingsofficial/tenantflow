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
  DollarSign, Building2, Users, Layers, Clock,
  AlertCircle, ChevronRight, MapPin, Activity, TrendingUp,
} from 'lucide-react'
import { format, subMonths, differenceInDays, differenceInMonths } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

function SparkBar({ value, max, color = '#6366f1' }: { value: number; max: number; color?: string }) {
  return (
    <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }} />
    </div>
  )
}

export default function CommercialReportsOverview() {
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
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-white/[0.04]" />)}
    </div>
  )
  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const activeLeases = data.leases.filter(l => l.status === 'active')
  const completedPayments = data.payments.filter(p => p.status === 'completed')

  const totalUnits = data.units.length
  const occupiedUnits = data.units.filter(u => u.status === 'occupied').length
  const vacantUnits = data.units.filter(u => u.status === 'vacant').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  // Total Leasable Area
  const totalGLA = data.units.reduce((s, u) => s + Number(u.area_sqm ?? 0), 0)
  const occupiedGLA = data.units.filter(u => u.status === 'occupied').reduce((s, u) => s + Number(u.area_sqm ?? 0), 0)
  const glaOccRate = totalGLA > 0 ? Math.round((occupiedGLA / totalGLA) * 100) : 0

  // Revenue
  const totalBaseRent = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const totalNNN = activeLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
  const monthlyRunRate = totalBaseRent + totalNNN
  const rentPSM = occupiedGLA > 0 ? Math.round((totalBaseRent / occupiedGLA) * 10) / 10 : 0

  const collectedThisMonth = completedPayments.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const collectedLastMonth = completedPayments.filter(p => p.payment_date?.startsWith(lastMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const collectionRate = monthlyRunRate > 0 ? Math.round((collectedThisMonth / monthlyRunRate) * 100) : 0
  const revDelta = collectedLastMonth > 0 ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100) : 0

  // WALT
  const walt = activeLeases.length > 0
    ? Math.round(activeLeases.reduce((s, l) => {
        const remaining = l.lease_end ? Math.max(0, differenceInMonths(new Date(l.lease_end), now)) : 24
        return s + (remaining * Number(l.rent_amount))
      }, 0) / Math.max(totalBaseRent, 1))
    : 0

  // Expiry exposure ≤12mo
  const expiryExposureRent = activeLeases
    .filter(l => l.lease_end && differenceInDays(new Date(l.lease_end), now) <= 365 && differenceInDays(new Date(l.lease_end), now) >= 0)
    .reduce((s, l) => s + Number(l.rent_amount), 0)
  const expiryPct = totalBaseRent > 0 ? Math.round((expiryExposureRent / totalBaseRent) * 100) : 0

  // Tenant concentration
  const tenantRentMap = activeLeases.reduce((acc: Record<string, number>, l) => {
    acc[l.tenant_id] = (acc[l.tenant_id] ?? 0) + Number(l.rent_amount)
    return acc
  }, {})
  const topTenantId = Object.entries(tenantRentMap).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topTenantRent = topTenantId ? tenantRentMap[topTenantId] : 0
  const topTenantPct = totalBaseRent > 0 ? Math.round((topTenantRent / totalBaseRent) * 100) : 0
  const topTenant = data.tenants.find(t => t.id === topTenantId)
  const topTenantName = topTenant?.company_name ?? `${topTenant?.first_name ?? ''} ${topTenant?.last_name ?? ''}`.trim()

  // Chart data
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const value = completedPayments.filter(p => p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), month: ms, value }
  })

  // Industries
  const industries = data.tenants.reduce((acc: Record<string, { count: number; rent: number }>, t) => {
    const key = t.industry ?? t.occupation ?? 'Other'
    const rent = activeLeases.filter(l => l.tenant_id === t.id).reduce((s, l) => s + Number(l.rent_amount), 0)
    if (!acc[key]) acc[key] = { count: 0, rent: 0 }
    acc[key].count += 1; acc[key].rent += rent
    return acc
  }, {})
  const topIndustries = Object.entries(industries).sort((a, b) => b[1].rent - a[1].rent).slice(0, 6)

  // Expiry schedule
  const expirySchedule = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(now, -i)
    const ms = format(m, 'yyyy-MM')
    const leases = activeLeases.filter(l => l.lease_end?.startsWith(ms))
    return { label: format(m, 'MMM yy'), ms, count: leases.length, rent: leases.reduce((s, l) => s + Number(l.rent_amount), 0) }
  })

  // Building stats
  const buildingStats = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bLeases = activeLeases.filter(l => bUnits.some(u => u.id === l.unit_id))
    const bOccupied = bUnits.filter(u => u.status === 'occupied').length
    const bRent = bLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
    const bNNN = bLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
    const bArea = bUnits.reduce((s, u) => s + Number(u.area_sqm ?? 0), 0)
    const bOccArea = bUnits.filter(u => u.status === 'occupied').reduce((s, u) => s + Number(u.area_sqm ?? 0), 0)
    const bLeaseIds = bLeases.map(l => l.id)
    const bCollected = completedPayments.filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
    const bWalt = bLeases.length > 0
      ? Math.round(bLeases.reduce((s, l) => {
          const rem = l.lease_end ? Math.max(0, differenceInMonths(new Date(l.lease_end), now)) : 24
          return s + rem
        }, 0) / bLeases.length) : 0
    return {
      ...b, total: bUnits.length, occupied: bOccupied,
      rent: bRent, nnn: bNNN, area: bArea, occArea: bOccArea,
      collected: bCollected, walt: bWalt,
      psm: bOccArea > 0 ? Math.round((bRent / bOccArea) * 10) / 10 : 0,
      unitRate: bUnits.length > 0 ? Math.round((bOccupied / bUnits.length) * 100) : 0,
      glaRate: bArea > 0 ? Math.round((bOccArea / bArea) * 100) : 0,
      collRate: (bRent + bNNN) > 0 ? Math.round((bCollected / (bRent + bNNN)) * 100) : 0,
    }
  }).sort((a, b) => b.rent - a.rent)

  const concentrationAlert = topTenantPct >= 25
  const expiryAlert = expiryPct >= 30

  const reportNav = [
    { title: 'Revenue Intelligence', sub: 'NNN collections, CAM, cash flow', stat: `$${collectedThisMonth.toLocaleString()}`, statSub: 'collected this month', href: '/reports/revenue', icon: DollarSign, color: 'emerald' },
    { title: 'Occupancy & GLA', sub: 'Area utilisation, vacancy cost', stat: `${glaOccRate > 0 ? glaOccRate : occupancyRate}%`, statSub: totalGLA > 0 ? 'GLA occupied' : 'units occupied', href: '/reports/occupancy', icon: Building2, color: 'blue' },
    { title: 'Tenants', sub: 'Industries, concentration, reliability', stat: `${data.tenants.filter(t => t.status === 'active').length}`, statSub: 'active tenants', href: '/reports/tenants', icon: Users, color: 'violet' },
    { title: 'Lease Health', sub: 'Expiry, WALT, rent deviation', stat: `${activeLeases.length}`, statSub: 'active leases', href: '/reports/leases', icon: FileText, color: 'amber' },
  ]

  return (
    <div className="min-h-screen bg-[#080a0f] pb-16 font-sans">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/[0.05]">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-600" />
              <p className="text-[10px] font-semibold tracking-[0.15em] text-indigo-400/80 uppercase">Commercial Portfolio</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">{format(now, 'MMMM yyyy')} · {data.buildings.length} assets · {totalUnits} units</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Monthly Run Rate</p>
            <p className="text-3xl font-bold text-white tracking-tight">${monthlyRunRate.toLocaleString()}</p>
            {totalNNN > 0 && <p className="text-[11px] text-indigo-400 mt-0.5">incl. ${totalNNN.toLocaleString()} NNN/CAM</p>}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(concentrationAlert || expiryAlert) && (
        <div className="px-6 pt-4 space-y-2">
          {concentrationAlert && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[12px]">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span className="text-amber-300"><strong>Concentration risk:</strong> {topTenantName} = {topTenantPct}% of base rent</span>
            </div>
          )}
          {expiryAlert && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[12px]">
              <Clock className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span className="text-rose-300"><strong>Expiry exposure:</strong> {expiryPct}% of income expires within 12 months</span>
            </div>
          )}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="px-6 pt-5 grid grid-cols-4 gap-3 mb-4">
        <KpiCard variant="dark" label="Gross Collected" value={`$${collectedThisMonth.toLocaleString()}`}
          sub={`${collectionRate}% of run rate`} trend={{ value: revDelta, label: 'vs last month' }} accent="emerald" icon={DollarSign} />
        <KpiCard variant="dark" label="NNN / CAM Charges" value={`$${totalNNN.toLocaleString()}`}
          sub={`${activeLeases.filter(l => Number(l.service_charge ?? 0) > 0).length} leases with NNN`} accent="blue" icon={Layers} />
        <KpiCard variant="dark" label="Unit Occupancy" value={`${occupancyRate}%`}
          sub={`${occupiedUnits} of ${totalUnits} units`}
          accent={occupancyRate >= 90 ? 'emerald' : occupancyRate >= 75 ? 'amber' : 'rose'} icon={Building2} />
        <KpiCard variant="dark" label="WALT" value={`${walt}mo`}
          sub="Weighted avg lease term" accent={walt >= 24 ? 'emerald' : walt >= 12 ? 'amber' : 'rose'} icon={Clock} />
      </div>

      {/* Secondary KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        <KpiCard variant="dark" label="Rent PSM" value={totalGLA > 0 ? `$${rentPSM}/m²` : '—'}
          sub={`${totalGLA.toLocaleString()} m² total GLA`} accent="violet" icon={MapPin} />
        <KpiCard variant="dark" label="GLA Occupancy" value={totalGLA > 0 ? `${glaOccRate}%` : '—'}
          sub={`${occupiedGLA.toLocaleString()} m² let`}
          accent={glaOccRate >= 90 ? 'emerald' : glaOccRate >= 75 ? 'amber' : 'rose'} icon={Activity} />
        <KpiCard variant="dark" label="Expiry Exposure" value={`${expiryPct}%`}
          sub="of income expiring ≤12mo" accent={expiryPct >= 30 ? 'rose' : expiryPct >= 15 ? 'amber' : 'emerald'} icon={AlertCircle} />
        <KpiCard variant="dark" label="Top Tenant %" value={`${topTenantPct}%`}
          sub={topTenantName || '—'} accent={topTenantPct >= 25 ? 'amber' : 'gray'} icon={Users} />
      </div>

      {/* Report nav cards */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {reportNav.map(card => {
          const colorMap: Record<string, { text: string; bg: string; border: string }> = {
            emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'group-hover:border-emerald-500/20' },
            blue:    { text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'group-hover:border-sky-500/20' },
            violet:  { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'group-hover:border-violet-500/20' },
            amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'group-hover:border-amber-500/20' },
          }
          const c = colorMap[card.color] ?? colorMap.emerald
          return (
            <button key={card.title} onClick={() => router.push(card.href)}
              className={`relative overflow-hidden group rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5 text-left transition-all duration-300 hover:border-white/[0.12] ${c.border} w-full`}>
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`h-4 w-4 ${c.text}`} />
              </div>
              <p className="text-[13px] font-bold text-white leading-tight">{card.title}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{card.sub}</p>
              <div className="flex items-end justify-between mt-4 pt-3.5 border-t border-white/[0.04]">
                <div>
                  <p className={`text-xl font-bold ${c.text}`}>{card.stat}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{card.statSub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Revenue chart */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-bold text-white">Revenue — Last 12 Months</p>
              <p className="text-[11px] text-gray-600 mt-0.5">Total collections including NNN/CAM</p>
            </div>
            <p className="text-lg font-bold text-white">
              ${completedPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
              <span className="text-[11px] text-gray-600 font-normal ml-1">all-time</span>
            </p>
          </div>
          <RevenueChart data={chartData} currentMonth={thisMonth} variant="dark" height={120} />
        </div>
      </div>

      {/* Asset performance table */}
      <div className="px-6 mb-5">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.05]">
            <p className="text-[13px] font-bold text-white">Asset Performance</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{data.buildings.length} buildings · {format(now, 'MMMM yyyy')}</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Asset', 'GLA (m²)', 'Occ.', 'Base Rent', 'NNN', 'PSM', 'WALT', 'Coll.'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildingStats.map(b => (
                <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => router.push('/reports/occupancy')}>
                  <td className="px-6 py-3.5">
                    <p className="text-[13px] font-semibold text-gray-200">{b.name}</p>
                    {b.address && <p className="text-[10px] text-gray-600 mt-0.5">{b.address}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-400">{b.area > 0 ? b.area.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${b.glaRate || b.unitRate}%`, backgroundColor: (b.glaRate || b.unitRate) >= 90 ? '#10b981' : (b.glaRate || b.unitRate) >= 75 ? '#f59e0b' : '#f43f5e' }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-300">{b.glaRate || b.unitRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-200">${b.rent.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-sky-400">{b.nnn > 0 ? `$${b.nnn.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-400">{b.psm > 0 ? `$${b.psm}/m²` : '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-400">{b.walt > 0 ? `${b.walt}mo` : '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      b.collRate >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      b.collRate >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>{b.collRate}%</span>
                  </td>
                </tr>
              ))}
              {buildingStats.length > 1 && (
                <tr className="border-t border-white/[0.06] bg-white/[0.01]">
                  <td className="px-6 py-2.5 text-[10px] font-semibold text-gray-500">TOTAL / AVG</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-400">{totalGLA.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-indigo-400">{glaOccRate || occupancyRate}%</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-300">${totalBaseRent.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-sky-400">${totalNNN.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-400">{rentPSM > 0 ? `$${rentPSM}/m²` : '—'}</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-400">{walt}mo</td>
                  <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-300">{collectionRate}%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Industry mix + expiry side by side */}
      <div className="px-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <p className="text-[13px] font-bold text-white mb-1">Tenant Mix by Industry</p>
          <p className="text-[11px] text-gray-600 mb-4">Ranked by monthly rent share</p>
          <div className="space-y-3">
            {topIndustries.map(([industry, { count, rent }]) => {
              const pct = totalBaseRent > 0 ? Math.round((rent / totalBaseRent) * 100) : 0
              return (
                <div key={industry}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-gray-300 capitalize">{industry}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-600">{count} tenant{count > 1 ? 's' : ''}</span>
                      <span className="text-[11px] font-bold text-indigo-400">{pct}%</span>
                    </div>
                  </div>
                  <SparkBar value={rent} max={totalBaseRent} color="#6366f1" />
                </div>
              )
            })}
            {topIndustries.length === 0 && <p className="text-[12px] text-gray-600 py-4 text-center">No industry data — add tenant profiles</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5">
          <p className="text-[13px] font-bold text-white mb-1">Lease Expiry Schedule</p>
          <p className="text-[11px] text-gray-600 mb-4">Next 6 months</p>
          <div className="space-y-2">
            {expirySchedule.map((m, i) => {
              const maxCount = Math.max(...expirySchedule.map(x => x.count), 1)
              const isUrgent = i <= 1 && m.count > 0
              return (
                <div key={m.ms} className={`flex items-center gap-3 p-2.5 rounded-xl ${isUrgent ? 'bg-rose-500/5 border border-rose-500/10' : 'bg-white/[0.02]'}`}>
                  <p className="text-[11px] text-gray-500 w-12 flex-shrink-0">{m.label}</p>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(m.count / maxCount) * 100}%`, backgroundColor: isUrgent ? '#f43f5e' : i <= 2 ? '#f59e0b' : '#6366f1' }} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-sm font-bold ${isUrgent ? 'text-rose-400' : 'text-gray-300'}`}>{m.count}</span>
                    {m.rent > 0 && <span className="text-[10px] text-gray-600">${m.rent.toLocaleString()}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fix missing import
import { FileText } from 'lucide-react'
