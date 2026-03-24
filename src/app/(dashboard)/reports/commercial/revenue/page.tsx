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
  CheckCircle2, Clock, Home, Layers,
  BarChart3, ArrowUpRight, ArrowDownRight,
  Zap, Target, PieChart, Activity
} from 'lucide-react'
import { format, subMonths, differenceInDays, differenceInMonths } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

// ─── Typed segment label ──────────────────────────────────────────────────────
type SegmentType = 'residential' | 'commercial'

// ─── Segment pill ─────────────────────────────────────────────────────────────
function SegmentPill({ type }: { type: SegmentType }) {
  if (type === 'residential') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
        <Home className="h-2.5 w-2.5" /> Resi
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
      <Building2 className="h-2.5 w-2.5" /> Comm
    </span>
  )
}

// ─── Split KPI card ───────────────────────────────────────────────────────────
function SplitCard({ label, resiValue, commValue, resiSub, commSub, icon: Icon }: {
  label: string
  resiValue: string | number
  commValue: string | number
  resiSub?: string
  commSub?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-4 hover:border-white/[0.1] transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-700" />}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <SegmentPill type="residential" />
          <p className="text-xl font-bold text-teal-400 mt-1">{resiValue}</p>
          {resiSub && <p className="text-[10px] text-gray-600">{resiSub}</p>}
        </div>
        <div className="space-y-1 border-l border-white/[0.04] pl-3">
          <SegmentPill type="commercial" />
          <p className="text-xl font-bold text-indigo-400 mt-1">{commValue}</p>
          {commSub && <p className="text-[10px] text-gray-600">{commSub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Unified metric ───────────────────────────────────────────────────────────
function UnifiedCard({ label, value, sub, accent = '#6366f1', icon: Icon }: {
  label: string; value: string; sub?: string; accent?: string;
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[9px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-700" />}
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────
function DonutChart({ resi, comm, total }: { resi: number; comm: number; total: number }) {
  const r = 38; const circ = 2 * Math.PI * r
  const resiPct = total > 0 ? resi / total : 0
  const commPct = total > 0 ? comm / total : 0
  const resiDash = resiPct * circ
  const commDash = commPct * circ
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1f2e" strokeWidth="12" />
      {resi > 0 && (
        <circle cx="50" cy="50" r={r} fill="none" stroke="#14b8a6" strokeWidth="12"
          strokeDasharray={`${resiDash} ${circ - resiDash}`} strokeDashoffset={0} />
      )}
      {comm > 0 && (
        <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="12"
          strokeDasharray={`${commDash} ${circ - commDash}`} strokeDashoffset={-resiDash} />
      )}
    </svg>
  )
}

// ─── Segment bar ──────────────────────────────────────────────────────────────
function SegmentBar({ resi, comm }: { resi: number; comm: number }) {
  const total = resi + comm
  const resiPct = total > 0 ? (resi / total) * 100 : 50
  const commPct = 100 - resiPct
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
      <div style={{ width: `${resiPct}%` }} className="bg-teal-500 transition-all duration-700" />
      <div style={{ width: `${commPct}%` }} className="bg-indigo-500 transition-all duration-700" />
    </div>
  )
}

export default function MixedReportsPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'residential' | 'commercial'>('overview')

  useEffect(() => {
    if (orgId) loadPortfolioData(supabase, orgId).then(d => { setData(d); setLoading(false) })
  }, [orgId])

  if (loading) return (
    <div className="min-h-screen bg-[#070a0f] p-6 space-y-4">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl bg-white/[0.03]" />)}
    </div>
  )

  if (!data) return null

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  // ── Segment detection: classify units by building type ──────────────────────
  // residential = building_type is residential; commercial = office/retail/warehouse/industrial
  const residentialBuildingIds = new Set(
    data.buildings
      .filter(b => !b.building_type || b.building_type === 'residential')
      .map(b => b.id)
  )
  const commercialBuildingIds = new Set(
    data.buildings
      .filter(b => b.building_type && b.building_type !== 'residential')
      .map(b => b.id)
  )

  const resiUnits = data.units.filter(u => residentialBuildingIds.has(u.building_id))
  const commUnits = data.units.filter(u => commercialBuildingIds.has(u.building_id))

  const resiLeases = data.leases.filter(l => resiUnits.some(u => u.id === l.unit_id) && l.status === 'active')
  const commLeases = data.leases.filter(l => commUnits.some(u => u.id === l.unit_id) && l.status === 'active')

  const completedPayments = data.payments.filter(p => p.status === 'completed')

  // ── Residential metrics ──────────────────────────────────────────────────────
  const resiOccupied = resiUnits.filter(u => u.status === 'occupied').length
  const resiOccRate = resiUnits.length > 0 ? Math.round((resiOccupied / resiUnits.length) * 100) : 0
  const resiRunRate = resiLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const resiCollected = completedPayments
    .filter(p => resiLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(thisMonth))
    .reduce((s, p) => s + Number(p.amount), 0)
  const resiCollRate = resiRunRate > 0 ? Math.round((resiCollected / resiRunRate) * 100) : 0

  // ── Commercial metrics ───────────────────────────────────────────────────────
  const commOccupied = commUnits.filter(u => u.status === 'occupied').length
  const commOccRate = commUnits.length > 0 ? Math.round((commOccupied / commUnits.length) * 100) : 0
  const commBaseRent = commLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const commNNN = commLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
  const commRunRate = commBaseRent + commNNN
  const commCollected = completedPayments
    .filter(p => commLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(thisMonth))
    .reduce((s, p) => s + Number(p.amount), 0)
  const commCollRate = commRunRate > 0 ? Math.round((commCollected / commRunRate) * 100) : 0

  // ── Portfolio totals ─────────────────────────────────────────────────────────
  const totalUnits = data.units.length
  const totalOccupied = data.units.filter(u => u.status === 'occupied').length
  const totalOccRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0
  const totalRunRate = resiRunRate + commRunRate
  const totalCollected = resiCollected + commCollected
  const totalCollRate = totalRunRate > 0 ? Math.round((totalCollected / totalRunRate) * 100) : 0

  // Income split
  const resiPct = totalRunRate > 0 ? Math.round((resiRunRate / totalRunRate) * 100) : 0
  const commPct = 100 - resiPct

  // 12-month
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const resiRev = completedPayments
      .filter(p => resiLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(ms))
      .reduce((s, p) => s + Number(p.amount), 0)
    const commRev = completedPayments
      .filter(p => commLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(ms))
      .reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), ms, resi: resiRev, comm: commRev, total: resiRev + commRev }
  })
  const maxRev = Math.max(...months12.map(m => m.total), 1)

  // Alerts
  const expiringSoon = data.leases.filter(l => {
    if (l.status !== 'active' || !l.lease_end) return false
    const d = differenceInDays(new Date(l.lease_end), now)
    return d >= 0 && d <= 30
  }).length

  // Buildings summary
  const buildingsSummary = data.buildings.map(b => {
    const isResi = residentialBuildingIds.has(b.id)
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bOcc = bUnits.filter(u => u.status === 'occupied').length
    const bLeases = data.leases.filter(l => bUnits.some(u => u.id === l.unit_id) && l.status === 'active')
    const bRent = bLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
    const bNNN = bLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
    const bLeaseIds = bLeases.map(l => l.id)
    const bCollected = completedPayments
      .filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth))
      .reduce((s, p) => s + Number(p.amount), 0)
    return {
      ...b,
      segment: (isResi ? 'residential' : 'commercial') as SegmentType,
      total: bUnits.length,
      occupied: bOcc,
      oRate: bUnits.length > 0 ? Math.round((bOcc / bUnits.length) * 100) : 0,
      rent: bRent,
      nnn: bNNN,
      collected: bCollected,
      cRate: (bRent + bNNN) > 0 ? Math.round((bCollected / (bRent + bNNN)) * 100) : 0,
    }
  }).sort((a, b) => (b.rent + b.nnn) - (a.rent + a.nnn))

  const tabs = [
    { id: 'overview', label: 'Portfolio Overview' },
    { id: 'residential', label: 'Residential' },
    { id: 'commercial', label: 'Commercial' },
  ] as const

  return (
    <div className="min-h-screen bg-[#070a0f] pb-16">
      {/* ── Header ── */}
      <div className="px-6 pt-8 pb-5 border-b border-white/[0.05]">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-0.5">
                <div className="w-1 h-4 rounded-full bg-teal-500" />
                <div className="w-1 h-4 rounded-full bg-indigo-500" />
              </div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">Mixed Portfolio</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">{format(now, 'MMMM yyyy')} · {data.buildings.length} assets · {resiUnits.length} resi + {commUnits.length} commercial units</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Total Run Rate</p>
            <p className="text-3xl font-bold text-white tracking-tight">${totalRunRate.toLocaleString()}</p>
            <div className="flex items-center gap-3 mt-1.5 justify-end">
              <span className="text-[11px] text-teal-400">${resiRunRate.toLocaleString()} resi</span>
              <span className="text-gray-700">·</span>
              <span className="text-[11px] text-indigo-400">${commRunRate.toLocaleString()} comm</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-5 bg-white/[0.03] rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-gray-600 hover:text-gray-400'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert strip ── */}
      {expiringSoon > 0 && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm cursor-pointer"
            onClick={() => router.push('/reports/leases')}>
            <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300 text-[12px]">
              <strong>{expiringSoon}</strong> lease{expiringSoon > 1 ? 's' : ''} expiring within 30 days
            </span>
            <ChevronRight className="h-3 w-3 text-amber-600 ml-auto" />
          </div>
        </div>
      )}

      {/* ══════════════ OVERVIEW TAB ══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="px-6 pt-5 space-y-5">

          {/* Income split visual */}
          <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-white">Income Composition</p>
                <p className="text-[11px] text-gray-600 mt-0.5">How your revenue is split across segments</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">${totalCollected.toLocaleString()}</p>
                <p className="text-[10px] text-gray-600">collected this month</p>
              </div>
            </div>

            {/* Stacked bar */}
            <SegmentBar resi={resiRunRate} comm={commRunRate} />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-sm text-gray-400">Residential</span>
                <span className="text-sm font-bold text-teal-400">{resiPct}%</span>
                <span className="text-[11px] text-gray-600 ml-1">${resiRunRate.toLocaleString()}/mo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-600 mr-1">${commRunRate.toLocaleString()}/mo</span>
                <span className="text-sm font-bold text-indigo-400">{commPct}%</span>
                <span className="text-sm text-gray-400">Commercial</span>
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              </div>
            </div>

            {/* Donut + detail */}
            <div className="flex items-center gap-6 mt-5 pt-5 border-t border-white/[0.04]">
              <div className="w-24 h-24 flex-shrink-0">
                <DonutChart resi={resiRunRate} comm={commRunRate} total={totalRunRate} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'Resi Units', resiV: resiUnits.length, commV: commUnits.length },
                  { label: 'Occupancy', resiV: `${resiOccRate}%`, commV: `${commOccRate}%` },
                  { label: 'Collected', resiV: `$${resiCollected.toLocaleString()}`, commV: `$${commCollected.toLocaleString()}` },
                  { label: 'Coll. Rate', resiV: `${resiCollRate}%`, commV: `${commCollRate}%` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-teal-400">{row.resiV}</span>
                      <span className="text-[8px] text-gray-700">vs</span>
                      <span className="text-xs font-semibold text-indigo-400">{row.commV}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <UnifiedCard label="Total Run Rate" value={`$${totalRunRate.toLocaleString()}`} sub={`${data.leases.filter(l => l.status === 'active').length} active leases`} accent="#e2e8f0" icon={DollarSign} />
            <UnifiedCard label="Portfolio Occupancy" value={`${totalOccRate}%`} sub={`${totalOccupied} of ${totalUnits} units`} accent={totalOccRate >= 85 ? '#14b8a6' : totalOccRate >= 70 ? '#f59e0b' : '#f43f5e'} icon={Building2} />
            <UnifiedCard label="Collection Rate" value={`${totalCollRate}%`} sub={`$${totalCollected.toLocaleString()} of $${totalRunRate.toLocaleString()}`} accent={totalCollRate >= 90 ? '#10b981' : totalCollRate >= 70 ? '#f59e0b' : '#f43f5e'} icon={CheckCircle2} />
            <UnifiedCard label="Commercial NNN/CAM" value={`$${commNNN.toLocaleString()}`} sub="service charges this month" accent="#818cf8" icon={Layers} />
          </div>

          {/* Split cards */}
          <div className="grid grid-cols-3 gap-3">
            <SplitCard label="Occupancy Rate" resiValue={`${resiOccRate}%`} commValue={`${commOccRate}%`}
              resiSub={`${resiOccupied}/${resiUnits.length} units`} commSub={`${commOccupied}/${commUnits.length} units`} icon={Home} />
            <SplitCard label="Run Rate / Month" resiValue={`$${resiRunRate.toLocaleString()}`} commValue={`$${commRunRate.toLocaleString()}`}
              resiSub={`${resiLeases.length} leases`} commSub={`${commLeases.length} leases + NNN`} icon={TrendingUp} />
            <SplitCard label="Collection Rate" resiValue={`${resiCollRate}%`} commValue={`${commCollRate}%`}
              resiSub={`$${resiCollected.toLocaleString()}`} commSub={`$${commCollected.toLocaleString()}`} icon={Activity} />
          </div>

          {/* 12-month stacked chart */}
          <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-bold text-white">Revenue — Last 12 Months</p>
                <p className="text-[11px] text-gray-600 mt-0.5">Segmented by residential and commercial</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-600">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-500" />Residential</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" />Commercial</div>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-28">
              {months12.map((m, i) => {
                const totalH = maxRev > 0 ? (m.total / maxRev) * 100 : 0
                const resiH = m.total > 0 ? (m.resi / m.total) * totalH : 0
                const commH = totalH - resiH
                const isCurrent = m.ms === thisMonth
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    {m.total > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1a1f2e] border border-white/10 text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        <span className="text-teal-400">${m.resi.toLocaleString()}</span>
                        <span className="text-gray-600 mx-1">+</span>
                        <span className="text-indigo-400">${m.comm.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="w-full flex flex-col-reverse" style={{ height: `${Math.max(totalH, m.total > 0 ? 4 : 0.5)}%`, minHeight: '2px' }}>
                      <div className="w-full transition-all"
                        style={{ height: `${resiH > 0 ? (resiH / totalH) * 100 : 0}%`, backgroundColor: isCurrent ? '#14b8a6' : 'rgba(20,184,166,0.5)' }} />
                      <div className="w-full rounded-t-sm transition-all"
                        style={{ height: `${commH > 0 ? (commH / totalH) * 100 : 0}%`, backgroundColor: isCurrent ? '#6366f1' : 'rgba(99,102,241,0.5)' }} />
                    </div>
                    <p className="text-[8px] text-gray-600">{m.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Asset table */}
          <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <p className="text-sm font-bold text-white">All Assets</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{data.buildings.length} buildings across both segments</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Asset', 'Segment', 'Units', 'Occupancy', 'Run Rate', 'Collected', 'Coll. Rate'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildingsSummary.map(b => (
                  <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => router.push(b.segment === 'residential' ? '/reports/occupancy' : '/commercial/reports/occupancy')}>
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-semibold text-gray-200">{b.name}</p>
                      {b.address && <p className="text-[10px] text-gray-600">{b.address}</p>}
                    </td>
                    <td className="px-4 py-3.5"><SegmentPill type={b.segment} /></td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">{b.total}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${b.oRate}%`, backgroundColor: b.segment === 'residential' ? '#14b8a6' : '#6366f1' }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-300">{b.oRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-200">${(b.rent + b.nnn).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold" style={{ color: b.segment === 'residential' ? '#14b8a6' : '#818cf8' }}>
                      ${b.collected.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.cRate >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        b.cRate >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>{b.cRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick nav to segment reports */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Residential Reports',
                items: ['Revenue', 'Occupancy', 'Tenants', 'Lease Health'],
                color: 'teal',
                routes: ['/reports/revenue', '/reports/occupancy', '/reports/tenants', '/reports/leases'],
              },
              {
                label: 'Commercial Reports',
                items: ['Revenue Intelligence', 'Occupancy & GLA'],
                color: 'indigo',
                routes: ['/commercial/reports/revenue', '/commercial/reports/occupancy'],
              },
            ].map(section => (
              <div key={section.label} className={`rounded-2xl bg-[#0d1117] border ${section.color === 'teal' ? 'border-teal-500/10' : 'border-indigo-500/10'} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1.5 h-4 rounded-full ${section.color === 'teal' ? 'bg-teal-500' : 'bg-indigo-500'}`} />
                  <p className="text-sm font-bold text-white">{section.label}</p>
                </div>
                <div className="space-y-1">
                  {section.items.map((item, i) => (
                    <button key={item} onClick={() => router.push(section.routes[i])}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[12px] font-medium text-gray-400 hover:text-white transition-colors ${section.color === 'teal' ? 'hover:bg-teal-500/5' : 'hover:bg-indigo-500/5'}`}>
                      {item}
                      <ChevronRight className="h-3 w-3 text-gray-700" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ RESIDENTIAL TAB ═══════════════════════════════════════ */}
      {activeTab === 'residential' && (
        <div className="px-6 pt-5 space-y-4">
          <div className="rounded-2xl bg-teal-500/5 border border-teal-500/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Home className="h-4 w-4 text-teal-400" />
              <p className="text-sm font-bold text-teal-300">Residential Segment Summary</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Units', value: resiUnits.length },
                { label: 'Occupied', value: `${resiOccRate}%` },
                { label: 'Run Rate', value: `$${resiRunRate.toLocaleString()}` },
                { label: 'Collection', value: `${resiCollRate}%` },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <p className="text-xl font-bold text-teal-400">{k.value}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Revenue', href: '/reports/revenue', sub: 'Collections, outstanding, trends' },
              { label: 'Occupancy', href: '/reports/occupancy', sub: 'Vacancies, turnaround, unit health' },
              { label: 'Tenants', href: '/reports/tenants', sub: 'Payment habits, tenure, reliability' },
              { label: 'Lease Health', href: '/reports/leases', sub: 'Expirations, renewals, rent analysis' },
            ].map(card => (
              <button key={card.label} onClick={() => router.push(card.href)}
                className="flex items-center justify-between p-4 rounded-xl bg-[#0d1117] border border-teal-500/10 hover:border-teal-500/25 text-left transition-all group">
                <div>
                  <p className="text-sm font-bold text-white">{card.label}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{card.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-700 group-hover:text-teal-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ COMMERCIAL TAB ════════════════════════════════════════ */}
      {activeTab === 'commercial' && (
        <div className="px-6 pt-5 space-y-4">
          <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-bold text-indigo-300">Commercial Segment Summary</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Units', value: commUnits.length },
                { label: 'Occupied', value: `${commOccRate}%` },
                { label: 'Base Rent', value: `$${commBaseRent.toLocaleString()}` },
                { label: 'NNN/CAM', value: `$${commNNN.toLocaleString()}` },
                { label: 'Collection', value: `${commCollRate}%` },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <p className="text-xl font-bold text-indigo-400">{k.value}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Revenue Intelligence', href: '/commercial/reports/revenue', sub: 'NNN, CAM, cash flow analysis' },
              { label: 'Occupancy & GLA', href: '/commercial/reports/occupancy', sub: 'Vacancy cost, tenant mix' },
            ].map(card => (
              <button key={card.label} onClick={() => router.push(card.href)}
                className="flex items-center justify-between p-4 rounded-xl bg-[#0d1117] border border-indigo-500/10 hover:border-indigo-500/25 text-left transition-all group">
                <div>
                  <p className="text-sm font-bold text-white">{card.label}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{card.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-700 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


