//src/app/(dashboard)/reports/commercial/page.tsx
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
  CheckCircle2, Clock, BarChart2, Layers,
  Activity, Percent, ArrowUpRight, ArrowDownRight,
  MapPin, Calendar, Zap
} from 'lucide-react'
import { format, subMonths, differenceInDays, differenceInMonths } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, delta, color = 'emerald', icon: Icon
}: {
  label: string; value: string | number; sub?: string;
  delta?: { value: number; label: string };
  color?: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'gray';
  icon?: React.ComponentType<{ className?: string }>
}) {
  const colors = {
    emerald: 'text-emerald-400',
    blue: 'text-sky-400',
    violet: 'text-violet-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    gray: 'text-gray-300',
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0f1117] border border-white/[0.06] p-5 group hover:border-white/[0.12] transition-all duration-300">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</p>
          {Icon && <Icon className={`h-4 w-4 ${colors[color]} opacity-60`} />}
        </div>
        <p className={`text-2xl font-bold tracking-tight ${colors[color]}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
        {delta && (
          <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${delta.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {delta.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta.value)}% {delta.label}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-200 tracking-tight">{title}</h2>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Sparkline Bar ───────────────────────────────────────────────────────────
function SparkBar({ value, max, color = '#6366f1' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default function CommercialReportsPage() {
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
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />
      ))}
    </div>
  )

  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  // ── Core computations ──────────────────────────────────────────────────────
  const activeLeases = data.leases.filter(l => l.status === 'active')
  const completedPayments = data.payments.filter(p => p.status === 'completed')

  const totalUnits = data.units.length
  const occupiedUnits = data.units.filter(u => u.status === 'occupied').length
  const vacantUnits = data.units.filter(u => u.status === 'vacant').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  // NNN / Base Rent separation using service_charge as proxy for CAM/NNN
  const totalBaseRent = activeLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const totalNNN = activeLeases.reduce((s, l) => s + Number((l as any).service_charge ?? 0), 0)
  const grossLeasableArea = data.units.reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)

  const rentPSM = grossLeasableArea > 0 ? Math.round((totalBaseRent / grossLeasableArea) * 10) / 10 : 0

  const collectedThisMonth = completedPayments
    .filter(p => p.payment_date?.startsWith(thisMonth))
    .reduce((s, p) => s + Number(p.amount), 0)
  const collectedLastMonth = completedPayments
    .filter(p => p.payment_date?.startsWith(lastMonth))
    .reduce((s, p) => s + Number(p.amount), 0)
  const collectionDelta = collectedLastMonth > 0
    ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100)
    : 0

  const monthlyRunRate = totalBaseRent + totalNNN
  const collectionRate = monthlyRunRate > 0 ? Math.round((collectedThisMonth / monthlyRunRate) * 100) : 0

  const walt = activeLeases.length > 0
    ? Math.round(
        activeLeases.reduce((s, l) => {
          const remaining = l.lease_end ? Math.max(0, differenceInMonths(new Date(l.lease_end), now)) : 24
          return s + (remaining * Number(l.rent_amount))
        }, 0) / Math.max(totalBaseRent, 1)
      )
    : 0

  const expiryExposureRent = activeLeases
    .filter(l => l.lease_end && differenceInDays(new Date(l.lease_end), now) <= 365 && differenceInDays(new Date(l.lease_end), now) >= 0)
    .reduce((s, l) => s + Number(l.rent_amount), 0)
  const expiryExposurePct = totalBaseRent > 0 ? Math.round((expiryExposureRent / totalBaseRent) * 100) : 0

  const tenantRentMap = activeLeases.reduce((acc: Record<string, number>, l) => {
    acc[l.tenant_id] = (acc[l.tenant_id] ?? 0) + Number(l.rent_amount)
    return acc
  }, {})
  const topTenantId = Object.entries(tenantRentMap).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topTenantRent = topTenantId ? tenantRentMap[topTenantId] : 0
  const topTenantPct = totalBaseRent > 0 ? Math.round((topTenantRent / totalBaseRent) * 100) : 0
  const topTenant = data.tenants.find(t => t.id === topTenantId)
  const topTenantName = (topTenant as any)?.company_name ?? `${topTenant?.first_name ?? ''} ${topTenant?.last_name ?? ''}`.trim()

  const months12 = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const collected = completedPayments
      .filter(p => p.payment_date?.startsWith(ms))
      .reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), ms, collected }
  })
  const maxRevenue = Math.max(...months12.map(m => m.collected), 1)

  const industries = data.tenants.reduce((acc: Record<string, { count: number; rent: number }>, t) => {
    const industry = (t as any).industry ?? (t as any).occupation ?? 'Other'
    const tLeases = activeLeases.filter(l => l.tenant_id === t.id)
    const tRent = tLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
    if (!acc[industry]) acc[industry] = { count: 0, rent: 0 }
    acc[industry].count += 1
    acc[industry].rent += tRent
    return acc
  }, {})
  const topIndustries = Object.entries(industries)
    .sort((a, b) => b[1].rent - a[1].rent)
    .slice(0, 6)

  const buildingStats = data.buildings.map(b => {
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bLeases = activeLeases.filter(l => bUnits.some(u => u.id === l.unit_id))
    const bOccupied = bUnits.filter(u => u.status === 'occupied').length
    const bRent = bLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
    const bNNN = bLeases.reduce((s, l) => s + Number((l as any).service_charge ?? 0), 0)
    const bArea = bUnits.reduce((s, u) => s + Number((u as any).area_sqm ?? 0), 0)
    const bLeaseIds = bLeases.map(l => l.id)
    const bCollected = completedPayments
      .filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth))
      .reduce((s, p) => s + Number(p.amount), 0)
    const bWalt = bLeases.length > 0
      ? Math.round(bLeases.reduce((s, l) => {
          const rem = l.lease_end ? Math.max(0, differenceInMonths(new Date(l.lease_end), now)) : 24
          return s + rem
        }, 0) / bLeases.length)
      : 0
    return {
      ...b,
      total: bUnits.length, occupied: bOccupied,
      rent: bRent, nnn: bNNN, area: bArea,
      collected: bCollected,
      psm: bArea > 0 ? Math.round((bRent / bArea) * 10) / 10 : 0,
      occupancyPct: bUnits.length > 0 ? Math.round((bOccupied / bUnits.length) * 100) : 0,
      walt: bWalt,
      collectionRate: (bRent + bNNN) > 0 ? Math.round((bCollected / (bRent + bNNN)) * 100) : 0,
    }
  }).sort((a, b) => b.rent - a.rent)

  const expirySchedule = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(now, -i)
    const ms = format(m, 'yyyy-MM')
    const expiring = activeLeases.filter(l => l.lease_end?.startsWith(ms))
    const expiringRent = expiring.reduce((s, l) => s + Number(l.rent_amount), 0)
    return { label: format(m, 'MMM yy'), ms, count: expiring.length, rent: expiringRent }
  })

  const concentrationAlert = topTenantPct >= 25
  const expiryAlert = expiryExposurePct >= 30

  const reportNav = [
    {
      title: 'Revenue Intelligence',
      sub: 'NNN collections, CAM, cash flow',
      stat: `$${collectedThisMonth.toLocaleString()}`,
      statSub: 'collected this month',
      color: 'emerald',
      href: '/commercial/reports/revenue',
      icon: DollarSign,
    },
    {
      title: 'Occupancy & Vacancy',
      sub: 'GLA utilisation, vacancy cost',
      stat: `${occupancyRate}%`,
      statSub: 'occupied',
      color: 'blue',
      href: '/commercial/reports/occupancy',
      icon: Building2,
    },
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
            <p className="text-sm text-gray-500 mt-1">{format(now, 'MMMM yyyy')} · {data.buildings.length} properties · {totalUnits} units</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Monthly Run Rate</p>
            <p className="text-3xl font-bold text-white tracking-tight">${monthlyRunRate.toLocaleString()}</p>
            <p className="text-[11px] text-indigo-400 mt-0.5">
              + ${totalNNN.toLocaleString()} NNN/CAM
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(concentrationAlert || expiryAlert) && (
        <div className="px-6 pt-4 space-y-2">
          {concentrationAlert && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span className="text-amber-300">
                <strong>Concentration risk:</strong> {topTenantName} accounts for {topTenantPct}% of base rent
              </span>
            </div>
          )}
          {expiryAlert && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm">
              <Calendar className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span className="text-rose-300">
                <strong>Expiry exposure:</strong> {expiryExposurePct}% of income expires within 12 months
              </span>
            </div>
          )}
        </div>
      )}

      {/* Core KPIs */}
      <div className="px-6 pt-5 grid grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Gross Rent Collected"
          value={`$${collectedThisMonth.toLocaleString()}`}
          sub={`${collectionRate}% of run rate`}
          delta={{ value: collectionDelta, label: 'vs last month' }}
          color="emerald"
          icon={DollarSign}
        />
        <MetricCard
          label="NNN / CAM Charges"
          value={`$${totalNNN.toLocaleString()}`}
          sub={`${activeLeases.length} leases with service charges`}
          color="blue"
          icon={Layers}
        />
        <MetricCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
          sub={`${occupiedUnits} of ${totalUnits} units let`}
          color={occupancyRate >= 90 ? 'emerald' : occupancyRate >= 75 ? 'amber' : 'rose'}
          icon={Building2}
        />
        <MetricCard
          label="WALT"
          value={`${walt}mo`}
          sub="Weighted average lease term"
          color={walt >= 24 ? 'emerald' : walt >= 12 ? 'amber' : 'rose'}
          icon={Clock}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Rent PSM"
          value={`$${rentPSM}/m²`}
          sub={`${grossLeasableArea.toLocaleString()} m² GLA`}
          color="violet"
          icon={MapPin}
        />
        <MetricCard
          label="Expiry Exposure"
          value={`${expiryExposurePct}%`}
          sub="of income expiring ≤12mo"
          color={expiryExposurePct >= 30 ? 'rose' : expiryExposurePct >= 15 ? 'amber' : 'emerald'}
          icon={AlertCircle}
        />
        <MetricCard
          label="Top Tenant Concentration"
          value={`${topTenantPct}%`}
          sub={topTenantName || '—'}
          color={topTenantPct >= 25 ? 'amber' : 'gray'}
          icon={Users}
        />
        <MetricCard
          label="Vacant Units"
          value={vacantUnits}
          sub={`${data.units.filter(u => u.status === 'maintenance').length} in maintenance`}
          color={vacantUnits === 0 ? 'emerald' : vacantUnits <= 2 ? 'amber' : 'rose'}
          icon={Activity}
        />
      </div>

      {/* Report Nav Cards */}
      <div className="px-6 grid grid-cols-2 gap-3 mb-6">
        {reportNav.map(card => (
          <button key={card.title} onClick={() => router.push(card.href)}
            className="relative overflow-hidden group rounded-2xl bg-[#0f1117] border border-white/[0.06] p-6 text-left hover:border-white/[0.14] transition-all duration-300">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: card.color === 'emerald'
                ? 'radial-gradient(ellipse at 100% 0%, rgba(16,185,129,0.08) 0%, transparent 60%)'
                : 'radial-gradient(ellipse at 100% 0%, rgba(14,165,233,0.08) 0%, transparent 60%)' }} />
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-bold text-white mb-1">{card.title}</p>
                <p className="text-[11px] text-gray-500">{card.sub}</p>
                <div className="mt-4">
                  <p className={`text-2xl font-bold ${card.color === 'emerald' ? 'text-emerald-400' : 'text-sky-400'}`}>{card.stat}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{card.statSub}</p>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color === 'emerald' ? 'bg-emerald-500/10' : 'bg-sky-500/10'}`}>
                <card.icon className={`h-5 w-5 ${card.color === 'emerald' ? 'text-emerald-400' : 'text-sky-400'}`} />
              </div>
            </div>
            <div className="relative flex items-center justify-end mt-3 pt-3 border-t border-white/[0.05]">
              <span className="text-[11px] text-gray-600 group-hover:text-gray-400 transition-colors flex items-center gap-1">
                Open report <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="px-6 mb-6">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-6">
          <SectionHeader
            title="Revenue — Last 12 Months"
            sub="Total collections including NNN/CAM"
            action={
              <p className="text-lg font-bold text-white">
                ${completedPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
                <span className="text-[11px] text-gray-600 font-normal ml-1.5">all-time</span>
              </p>
            }
          />
          <div className="flex items-end gap-1.5 h-24 mt-2">
            {months12.map((m, i) => {
              const h = maxRevenue > 0 ? (m.collected / maxRevenue) * 100 : 0
              const isCurrent = m.ms === thisMonth
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {m.collected > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      ${m.collected.toLocaleString()}
                    </div>
                  )}
                  <div className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(h, m.collected > 0 ? 4 : 0.5)}%`,
                      background: isCurrent
                        ? 'linear-gradient(to top, #6366f1, #a5b4fc)'
                        : 'linear-gradient(to top, rgba(99,102,241,0.5), rgba(165,180,252,0.3))',
                      minHeight: '2px',
                    }} />
                  <p className="text-[9px] text-gray-600">{m.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Building Performance */}
      <div className="px-6 mb-6">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.05]">
            <SectionHeader
              title="Asset Performance"
              sub={`${data.buildings.length} buildings · ${format(now, 'MMMM yyyy')}`}
            />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Asset', 'GLA (m²)', 'Occupancy', 'Base Rent', 'NNN', 'PSM', 'WALT', 'Collection'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-6">{h}</th>
                ))}
                 </tr>
            </thead>
            <tbody>
              {buildingStats.map((b, i) => (
                <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => router.push('/commercial/reports/occupancy')}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-200">{b.name}</p>
                    {b.address && <p className="text-[10px] text-gray-600 mt-0.5">{b.address}</p>}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400">{b.area > 0 ? b.area.toLocaleString() : '—'}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${b.occupancyPct}%`, backgroundColor: b.occupancyPct >= 90 ? '#10b981' : b.occupancyPct >= 75 ? '#f59e0b' : '#f43f5e' }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-300">{b.occupancyPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-200">${b.rent.toLocaleString()}</td>
                  <td className="px-4 py-4 text-sm text-sky-400">${b.nnn.toLocaleString()}</td>
                  <td className="px-4 py-4 text-sm text-gray-400">{b.psm > 0 ? `$${b.psm}/m²` : '—'}</td>
                  <td className="px-4 py-4 text-sm text-gray-400">{b.walt > 0 ? `${b.walt}mo` : '—'}</td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      b.collectionRate >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      b.collectionRate >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>{b.collectionRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {buildingStats.length > 1 && (
              <tfoot>
                <tr className="border-t border-white/[0.06] bg-white/[0.01]">
                  <td className="px-6 py-3 text-[10px] font-semibold text-gray-500">TOTAL / AVG</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-gray-400">{grossLeasableArea.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-indigo-400">{occupancyRate}%</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-gray-300">${totalBaseRent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-sky-400">${totalNNN.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-gray-400">${rentPSM}/m²</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-gray-400">{walt}mo</td>
                  <td className="px-4 py-3 text-[10px] font-semibold text-gray-300">{collectionRate}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Tenant Mix + Expiry */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-6">
          <SectionHeader title="Tenant Mix" sub="By industry / sector" />
          <div className="space-y-3">
            {topIndustries.map(([industry, { count, rent }]) => {
              const pct = totalBaseRent > 0 ? Math.round((rent / totalBaseRent) * 100) : 0
              return (
                <div key={industry}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-300 capitalize">{industry}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-600">{count} tenant{count > 1 ? 's' : ''}</span>
                      <span className="text-xs font-bold text-indigo-400">{pct}%</span>
                    </div>
                  </div>
                  <SparkBar value={rent} max={totalBaseRent} color="#6366f1" />
                </div>
              )
            })}
            {topIndustries.length === 0 && (
              <p className="text-sm text-gray-600 py-4 text-center">No industry data — add tenant profiles</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-6">
          <SectionHeader title="Lease Expiry Schedule" sub="Next 6 months" />
          <div className="space-y-2">
            {expirySchedule.map((m, i) => {
              const maxCount = Math.max(...expirySchedule.map(x => x.count), 1)
              const isUrgent = i <= 1 && m.count > 0
              return (
                <div key={m.ms} className={`flex items-center gap-3 p-3 rounded-xl ${isUrgent ? 'bg-rose-500/5 border border-rose-500/10' : 'bg-white/[0.02]'}`}>
                  <p className="text-[11px] text-gray-500 w-12 flex-shrink-0">{m.label}</p>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${maxCount > 0 ? (m.count / maxCount) * 100 : 0}%`,
                        backgroundColor: isUrgent ? '#f43f5e' : i <= 2 ? '#f59e0b' : '#6366f1',
                      }} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-bold ${isUrgent ? 'text-rose-400' : 'text-gray-300'}`}>{m.count}</span>
                    {m.rent > 0 && <span className="text-[10px] text-gray-600">${m.rent.toLocaleString()}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Tenants */}
      <div className="px-6 mb-6">
        <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.05]">
            <SectionHeader title="Tenant Leaderboard" sub="Ranked by monthly rent commitment" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['#', 'Tenant', 'Industry', 'Unit', 'Base Rent', 'NNN', 'Lease End', 'Concentration'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeLeases
                .sort((a, b) => Number(b.rent_amount) - Number(a.rent_amount))
                .slice(0, 10)
                .map((lease, i) => {
                  const tenant = data.tenants.find(t => t.id === lease.tenant_id)
                  const unit = data.units.find(u => u.id === lease.unit_id)
                  const building = data.buildings.find(b => b.id === unit?.building_id)
                  const name = (tenant as any)?.company_name ?? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
                  const pct = totalBaseRent > 0 ? Math.round((Number(lease.rent_amount) / totalBaseRent) * 100) : 0
                  const isExpiringSoon = lease.lease_end && differenceInDays(new Date(lease.lease_end), now) <= 90 && differenceInDays(new Date(lease.lease_end), now) >= 0
                  return (
                    <tr key={lease.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => router.push(`/leases/${lease.id}`)}>
                      <td className="px-6 py-3.5 text-sm font-bold text-gray-600">#{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-200">{name || '—'}</p>
                        {(tenant as any)?.industry && <p className="text-[10px] text-gray-600">{(tenant as any).company_reg_number ?? ''}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 capitalize">{(tenant as any)?.industry ?? (tenant as any)?.occupation ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{unit?.unit_code ?? '—'} · {building?.name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-gray-200">${Number(lease.rent_amount).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-sky-400">
                        {Number((lease as any).service_charge ?? 0) > 0 ? `$${Number((lease as any).service_charge).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {lease.lease_end ? (
                          <span className={`text-xs ${isExpiringSoon ? 'text-rose-400 font-semibold' : 'text-gray-500'}`}>
                            {format(new Date(lease.lease_end), 'MMM d, yyyy')}
                            {isExpiringSoon && ' ⚠'}
                          </span>
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: pct >= 20 ? '#f59e0b' : '#6366f1' }} />
                          </div>
                          <span className={`text-xs font-bold ${pct >= 20 ? 'text-amber-400' : 'text-gray-400'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

