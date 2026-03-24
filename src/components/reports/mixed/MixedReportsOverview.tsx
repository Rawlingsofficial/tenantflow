'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/ui/kpi-card'
import { StackedRevenueChart } from '@/components/reports/RevenueChart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign, Building2, Users, FileText, Home,
  ChevronRight, CheckCircle2, Layers, AlertCircle, Clock,
} from 'lucide-react'
import { format, subMonths, differenceInDays } from 'date-fns'
import type { PortfolioData } from '@/types/reports'

type SegType = 'residential' | 'commercial'

function SegmentPill({ type }: { type: SegType }) {
  if (type === 'residential')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20"><Home className="h-2.5 w-2.5" />Resi</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><Building2 className="h-2.5 w-2.5" />Comm</span>
}

function SegmentBar({ resi, comm }: { resi: number; comm: number }) {
  const total = resi + comm
  const resiPct = total > 0 ? (resi / total) * 100 : 50
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
      <div style={{ width: `${resiPct}%` }} className="bg-teal-500 transition-all duration-700" />
      <div style={{ width: `${100 - resiPct}%` }} className="bg-indigo-500 transition-all duration-700" />
    </div>
  )
}

export default function MixedReportsOverview() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Segment classification
  const resiBuildingIds = new Set(data.buildings.filter(b => !b.building_type || b.building_type === 'residential').map(b => b.id))
  const resiUnits = data.units.filter(u => resiBuildingIds.has(u.building_id))
  const commUnits = data.units.filter(u => !resiBuildingIds.has(u.building_id))

  const resiLeases = data.leases.filter(l => resiUnits.some(u => u.id === l.unit_id) && l.status === 'active')
  const commLeases = data.leases.filter(l => commUnits.some(u => u.id === l.unit_id) && l.status === 'active')
  const completed = data.payments.filter(p => p.status === 'completed')

  // Residential metrics
  const resiOccupied = resiUnits.filter(u => u.status === 'occupied').length
  const resiOccRate = resiUnits.length > 0 ? Math.round((resiOccupied / resiUnits.length) * 100) : 0
  const resiRunRate = resiLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const resiCollected = completed.filter(p => resiLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const resiCollRate = resiRunRate > 0 ? Math.round((resiCollected / resiRunRate) * 100) : 0

  // Commercial metrics
  const commOccupied = commUnits.filter(u => u.status === 'occupied').length
  const commOccRate = commUnits.length > 0 ? Math.round((commOccupied / commUnits.length) * 100) : 0
  const commBaseRent = commLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
  const commNNN = commLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
  const commRunRate = commBaseRent + commNNN
  const commCollected = completed.filter(p => commLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const commCollRate = commRunRate > 0 ? Math.round((commCollected / commRunRate) * 100) : 0

  // Totals
  const totalUnits = data.units.length
  const totalOccupied = data.units.filter(u => u.status === 'occupied').length
  const totalOccRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0
  const totalRunRate = resiRunRate + commRunRate
  const totalCollected = resiCollected + commCollected
  const totalCollRate = totalRunRate > 0 ? Math.round((totalCollected / totalRunRate) * 100) : 0
  const resiPct = totalRunRate > 0 ? Math.round((resiRunRate / totalRunRate) * 100) : 50
  const commPct = 100 - resiPct

  // Chart data
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(now, 11 - i)
    const ms = format(m, 'yyyy-MM')
    const resi = completed.filter(p => resiLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    const comm = completed.filter(p => commLeases.some(l => l.id === p.lease_id) && p.payment_date?.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0)
    return { label: format(m, 'MMM'), month: ms, resi, comm }
  })

  // Building summary
  const buildingsSummary = data.buildings.map(b => {
    const isResi = resiBuildingIds.has(b.id)
    const bUnits = data.units.filter(u => u.building_id === b.id)
    const bOcc = bUnits.filter(u => u.status === 'occupied').length
    const bLeases = data.leases.filter(l => bUnits.some(u => u.id === l.unit_id) && l.status === 'active')
    const bRent = bLeases.reduce((s, l) => s + Number(l.rent_amount), 0)
    const bNNN = bLeases.reduce((s, l) => s + Number(l.service_charge ?? 0), 0)
    const bLeaseIds = bLeases.map(l => l.id)
    const bColl = completed.filter(p => bLeaseIds.includes(p.lease_id) && p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
    return {
      ...b, segment: (isResi ? 'residential' : 'commercial') as SegType,
      total: bUnits.length, occupied: bOcc,
      rent: bRent, nnn: bNNN, collected: bColl,
      oRate: bUnits.length > 0 ? Math.round((bOcc / bUnits.length) * 100) : 0,
      cRate: (bRent + bNNN) > 0 ? Math.round((bColl / (bRent + bNNN)) * 100) : 0,
    }
  }).sort((a, b) => (b.rent + b.nnn) - (a.rent + a.nnn))

  const expiringSoon = data.leases.filter(l => { if (l.status !== 'active' || !l.lease_end) return false; const d = differenceInDays(new Date(l.lease_end), now); return d >= 0 && d <= 30 }).length

  return (
    <div className="min-h-screen bg-[#070a0f] pb-16">
      {/* Header */}
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
            <p className="text-[12px] text-gray-600 mt-1">{format(now, 'MMMM yyyy')} · {data.buildings.length} assets · {resiUnits.length} resi + {commUnits.length} commercial units</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Total Run Rate</p>
            <p className="text-3xl font-bold text-white">${totalRunRate.toLocaleString()}</p>
            <div className="flex items-center gap-3 mt-1 justify-end">
              <span className="text-[11px] text-teal-400">${resiRunRate.toLocaleString()} resi</span>
              <span className="text-gray-700">·</span>
              <span className="text-[11px] text-indigo-400">${commRunRate.toLocaleString()} comm</span>
            </div>
          </div>
        </div>
      </div>

      {expiringSoon > 0 && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[12px] cursor-pointer" onClick={() => router.push('/reports/leases')}>
            <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300"><strong>{expiringSoon}</strong> lease{expiringSoon > 1 ? 's' : ''} expiring within 30 days</span>
            <ChevronRight className="h-3 w-3 text-amber-600 ml-auto" />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-5">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl mb-5 w-fit">
            <TabsTrigger value="overview" className="text-[11px] font-semibold rounded-lg data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-gray-600 px-4 py-1.5">Portfolio Overview</TabsTrigger>
            <TabsTrigger value="residential" className="text-[11px] font-semibold rounded-lg data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-300 text-gray-600 px-4 py-1.5">Residential</TabsTrigger>
            <TabsTrigger value="commercial" className="text-[11px] font-semibold rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-300 text-gray-600 px-4 py-1.5">Commercial</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-5 mt-0">
            {/* Income composition */}
            <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[13px] font-bold text-white">Income Composition</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Revenue split across portfolio segments</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">${totalCollected.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">collected this month</p>
                </div>
              </div>
              <SegmentBar resi={resiRunRate} comm={commRunRate} />
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="text-[12px] text-gray-400">Residential</span>
                  <span className="text-[12px] font-bold text-teal-400">{resiPct}%</span>
                  <span className="text-[10px] text-gray-600">${resiRunRate.toLocaleString()}/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">${commRunRate.toLocaleString()}/mo</span>
                  <span className="text-[12px] font-bold text-indigo-400">{commPct}%</span>
                  <span className="text-[12px] text-gray-400">Commercial</span>
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
              </div>
              {/* Comparison grid */}
              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/[0.04]">
                {[
                  { label: 'Units', resi: resiUnits.length, comm: commUnits.length },
                  { label: 'Occupancy', resi: `${resiOccRate}%`, comm: `${commOccRate}%` },
                  { label: 'Run Rate', resi: `$${resiRunRate.toLocaleString()}`, comm: `$${commRunRate.toLocaleString()}` },
                  { label: 'Coll. Rate', resi: `${resiCollRate}%`, comm: `${commCollRate}%` },
                ].map(row => (
                  <div key={row.label} className="bg-white/[0.02] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-600 mb-2">{row.label}</p>
                    <div className="flex items-center justify-around">
                      <div>
                        <p className="text-[11px] font-bold text-teal-400">{row.resi}</p>
                        <p className="text-[9px] text-gray-700">resi</p>
                      </div>
                      <div className="w-px h-4 bg-white/[0.06]" />
                      <div>
                        <p className="text-[11px] font-bold text-indigo-400">{row.comm}</p>
                        <p className="text-[9px] text-gray-700">comm</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio KPIs */}
            <div className="grid grid-cols-4 gap-3">
              <KpiCard variant="dark" label="Total Run Rate" value={`$${totalRunRate.toLocaleString()}`} sub={`${data.leases.filter(l => l.status === 'active').length} leases`} accent="gray" icon={DollarSign} />
              <KpiCard variant="dark" label="Portfolio Occupancy" value={`${totalOccRate}%`} sub={`${totalOccupied} of ${totalUnits} units`} accent={totalOccRate >= 85 ? 'emerald' : totalOccRate >= 70 ? 'amber' : 'rose'} icon={Building2} />
              <KpiCard variant="dark" label="Collection Rate" value={`${totalCollRate}%`} sub={`$${totalCollected.toLocaleString()} collected`} accent={totalCollRate >= 90 ? 'emerald' : totalCollRate >= 70 ? 'amber' : 'rose'} icon={CheckCircle2} />
              <KpiCard variant="dark" label="Commercial NNN/CAM" value={`$${commNNN.toLocaleString()}`} sub="service charges" accent="indigo" icon={Layers} />
            </div>

            {/* Stacked revenue chart */}
            <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[13px] font-bold text-white">Revenue — Last 12 Months</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Stacked by segment</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-600">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-500" />Residential</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" />Commercial</div>
                </div>
              </div>
              <StackedRevenueChart data={chartData} currentMonth={thisMonth} height={120} />
            </div>

            {/* Asset table */}
            <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.04]">
                <p className="text-[13px] font-bold text-white">All Assets</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{data.buildings.length} buildings</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Asset', 'Segment', 'Units', 'Occupancy', 'Run Rate', 'Collected', 'Rate'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[9px] font-semibold tracking-[0.1em] text-gray-600 uppercase first:px-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildingsSummary.map(b => (
                    <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => router.push('/reports/occupancy')}>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-semibold text-gray-200">{b.name}</p>
                        {b.address && <p className="text-[10px] text-gray-600">{b.address}</p>}
                      </td>
                      <td className="px-4 py-3.5"><SegmentPill type={b.segment} /></td>
                      <td className="px-4 py-3.5 text-sm text-gray-400">{b.total}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.oRate}%`, backgroundColor: b.segment === 'residential' ? '#14b8a6' : '#6366f1' }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-300">{b.oRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-200">${(b.rent + b.nnn).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold" style={{ color: b.segment === 'residential' ? '#14b8a6' : '#818cf8' }}>${b.collected.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.cRate >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : b.cRate >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{b.cRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── RESIDENTIAL ── */}
          <TabsContent value="residential" className="mt-0 space-y-4">
            <div className="rounded-2xl bg-teal-500/[0.04] border border-teal-500/15 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-4 w-4 text-teal-400" />
                <p className="text-[13px] font-bold text-teal-300">Residential Segment</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Units', value: resiUnits.length },
                  { label: 'Occupancy', value: `${resiOccRate}%` },
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
                { label: 'Occupancy', href: '/reports/occupancy', sub: 'Vacancies, turnaround, health' },
                { label: 'Tenants', href: '/reports/tenants', sub: 'Payment habits & reliability' },
                { label: 'Lease Health', href: '/reports/leases', sub: 'Expirations, renewals, rent' },
              ].map(card => (
                <button key={card.label} onClick={() => router.push(card.href)}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0d1117] border border-teal-500/10 hover:border-teal-500/25 text-left transition-all group">
                  <div>
                    <p className="text-[13px] font-bold text-white">{card.label}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{card.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-700 group-hover:text-teal-400 transition-colors" />
                </button>
              ))}
            </div>
          </TabsContent>

          {/* ── COMMERCIAL ── */}
          <TabsContent value="commercial" className="mt-0 space-y-4">
            <div className="rounded-2xl bg-indigo-500/[0.04] border border-indigo-500/15 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-indigo-400" />
                <p className="text-[13px] font-bold text-indigo-300">Commercial Segment</p>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Units', value: commUnits.length },
                  { label: 'Occupancy', value: `${commOccRate}%` },
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
                { label: 'Revenue Intelligence', href: '/reports/revenue', sub: 'NNN, CAM, cash flow analysis' },
                { label: 'Occupancy & GLA', href: '/reports/occupancy', sub: 'Vacancy cost, area utilisation' },
                { label: 'Tenants', href: '/reports/tenants', sub: 'Industries, concentration' },
                { label: 'Lease Health', href: '/reports/leases', sub: 'WALT, expiry, rent deviation' },
              ].map(card => (
                <button key={card.label} onClick={() => router.push(card.href)}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0d1117] border border-indigo-500/10 hover:border-indigo-500/25 text-left transition-all group">
                  <div>
                    <p className="text-[13px] font-bold text-white">{card.label}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{card.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-700 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


