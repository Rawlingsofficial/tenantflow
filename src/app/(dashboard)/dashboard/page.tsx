'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { isSameMonth, format, subMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  Building2, Home, Users, FileText,
  TrendingUp, ChevronRight, AlertCircle,
  CheckCircle2, CreditCard, ArrowUpRight,
  Receipt, Briefcase
} from 'lucide-react'
import { usePropertyType } from '@/hooks/usePropertyType'

// ── Same interfaces as before ──────────────────────────────────
interface TenantRow {
  id: string; name: string; unit: string; building: string
  leaseStart: string; leaseEnd: string | null
  rent: number; paidThisMonth: boolean; avatar: string
}
interface NotifRow {
  id: string; name: string; unit: string
  status: 'expired' | 'expiring'; days: number; avatar: string
}
interface OccupancyPoint { month: string; occupied: number; vacant: number; rate: number }
interface ExpirationPoint { month: string; count: number; isCurrentMonth: boolean }
interface DashboardState {
  totalBuildings: number; totalUnits: number; occupiedUnits: number; vacantUnits: number
  activeTenants: number; expiringCount: number; activeLeases: number
  expectedMonthly: number; collectedThisMonth: number; outstandingBalance: number
  occupancyRate: number; occupancyHistory: OccupancyPoint[]; leaseExpirations: ExpirationPoint[]
  latestTenants: TenantRow[]; notifications: NotifRow[]
}
interface CommercialStats {
  totalCompanies: number; activeCompanies: number
  comOccupied: number; comTotal: number; comOccupancyRate: number
  comMonthlyExpected: number; comOverdue: number; comCollected: number
}

// ── Tooltips (unchanged) ───────────────────────────────────────
function OccupancyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-teal-600 font-bold">{payload[0]?.value}% occupancy</p>
      {payload[0]?.payload?.occupied !== undefined && (
        <p className="text-slate-400 mt-0.5">
          {payload[0].payload.occupied} occupied · {payload[0].payload.vacant} vacant
        </p>
      )}
    </div>
  )
}
function ExpirationTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-[#0f1f3d] font-bold">{payload[0]?.value} lease{payload[0]?.value !== 1 ? 's' : ''} expiring</p>
    </div>
  )
}

export default function DashboardPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { type, loading: typeLoading } = usePropertyType()
  const [data, setData] = useState<DashboardState | null>(null)
  const [comData, setComData] = useState<CommercialStats | null>(null)
  const [loading, setLoading] = useState(true)

  const isMixed = type === 'mixed'
  const isCommercial = type === 'commercial'

  useEffect(() => {
    if (orgId && !typeLoading) loadDashboard()
  }, [orgId, typeLoading])

  async function loadDashboard() {
    setLoading(true)
    try {
      const db = supabase as any
      const now = new Date()

      // ── Buildings ──────────────────────────────────────────────
      const { data: buildings } = await db
        .from('buildings').select('id, building_type')
        .eq('organization_id', orgId!).eq('status', 'active')

      const allBuildings = buildings ?? []
      const resBuildingIds = allBuildings.filter((b: any) => b.building_type !== 'commercial').map((b: any) => b.id)
      const comBuildingIds = allBuildings.filter((b: any) => b.building_type === 'commercial').map((b: any) => b.id)
      // For residential-only, use all buildings; for mixed use res only
      const buildingIds = (isMixed || isCommercial) ? resBuildingIds : allBuildings.map((b: any) => b.id)
      const effectiveBuildingIds = isCommercial ? comBuildingIds : (isMixed ? resBuildingIds : allBuildings.map((b: any) => b.id))

      // ── Units ──────────────────────────────────────────────────
      const { data: units } = await db.from('units').select('id, status')
        .in('building_id', effectiveBuildingIds.length > 0 ? effectiveBuildingIds : ['none'])
      const allUnits: any[] = units ?? []
      const totalUnits = allUnits.length
      const occupiedUnits = allUnits.filter((u) => u.status === 'occupied').length
      const vacantUnits = allUnits.filter((u) => u.status === 'vacant').length
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

      // ── Tenants (residential individuals) ─────────────────────
      const { data: tenants } = await db.from('tenants').select('id')
        .eq('organization_id', orgId!).eq('status', 'active').eq('tenant_type', 'individual')

      // ── Leases ─────────────────────────────────────────────────
      const { data: leases } = await db.from('leases')
        .select(`id, status, rent_amount, lease_start, lease_end, tenant_id, unit_id,
          tenants(id, first_name, last_name),
          units(unit_code, buildings(name)),
          rent_payments(amount, payment_date, status)`)
        .eq('organization_id', orgId!).order('lease_start', { ascending: false })

      const allLeases: any[] = leases ?? []
      // Filter to residential leases for the residential section
      const resUnitIds = new Set(allUnits.map((u: any) => u.id))
      const activeLeases = allLeases.filter((l) => l.status === 'active' && resUnitIds.has(l.unit_id))

      const today = now.toISOString().split('T')[0]
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const expiring = activeLeases.filter((l) => l.lease_end && l.lease_end >= today && l.lease_end <= in30)
      const expired = activeLeases.filter((l) => l.lease_end && l.lease_end < today)

      const expectedMonthly = activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)
      const collectedThisMonth = activeLeases.reduce((sum, l) => {
        const paid = (l.rent_payments ?? []).filter((p: any) =>
          p.status === 'completed' && isSameMonth(new Date(p.payment_date), now)
        ).reduce((s: number, p: any) => s + Number(p.amount), 0)
        return sum + paid
      }, 0)
      const outstandingBalance = Math.max(0, expectedMonthly - collectedThisMonth)

      // ── Occupancy history ──────────────────────────────────────
      const occupancyHistory: OccupancyPoint[] = Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(now, 5 - i)
        const monthStart = startOfMonth(month).toISOString().split('T')[0]
        const monthEnd = endOfMonth(month).toISOString().split('T')[0]
        const activeInMonth = allLeases.filter((l) => l.lease_start <= monthEnd && (!l.lease_end || l.lease_end >= monthStart)).length
        const rate = totalUnits > 0 ? Math.min(100, Math.round((Math.min(activeInMonth, totalUnits) / totalUnits) * 100)) : 0
        return { month: format(month, 'MMM'), occupied: Math.min(activeInMonth, totalUnits), vacant: Math.max(0, totalUnits - Math.min(activeInMonth, totalUnits)), rate }
      })

      const leaseExpirations: ExpirationPoint[] = Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(now, 2 - i)
        const monthStart = startOfMonth(month).toISOString().split('T')[0]
        const monthEnd = endOfMonth(month).toISOString().split('T')[0]
        return {
          month: format(month, 'MMM yyyy'),
          count: allLeases.filter((l) => l.lease_end && l.lease_end >= monthStart && l.lease_end <= monthEnd).length,
          isCurrentMonth: isSameMonth(month, now),
        }
      })

      const latestTenants: TenantRow[] = activeLeases.slice(0, 5).map((l: any) => {
        const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
        const paidThisMonth = (l.rent_payments ?? []).filter((p: any) =>
          p.status === 'completed' && isSameMonth(new Date(p.payment_date), now)
        ).reduce((s: number, p: any) => s + Number(p.amount), 0) >= Number(l.rent_amount)
        return { id: l.id, name: name || 'Unknown', unit: l.units?.unit_code ?? '—', building: l.units?.buildings?.name ?? '—', leaseStart: l.lease_start, leaseEnd: l.lease_end, rent: Number(l.rent_amount), paidThisMonth, avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase() }
      })

      const notifications: NotifRow[] = [
        ...expired.slice(0, 3).map((l: any) => ({ id: l.id, name: `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim() || 'Unknown', unit: `${l.units?.unit_code ?? '—'} · ${l.units?.buildings?.name ?? ''}`, status: 'expired' as const, days: Math.abs(differenceInDays(new Date(l.lease_end!), now)), avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase() })),
        ...expiring.slice(0, 4).map((l: any) => ({ id: l.id, name: `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim() || 'Unknown', unit: `${l.units?.unit_code ?? '—'} · ${l.units?.buildings?.name ?? ''}`, status: 'expiring' as const, days: differenceInDays(new Date(l.lease_end!), now), avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase() })),
      ].slice(0, 5)

      setData({ totalBuildings: allBuildings.length, totalUnits, occupiedUnits, vacantUnits, activeTenants: (tenants ?? []).length, expiringCount: expiring.length, activeLeases: activeLeases.length, expectedMonthly, collectedThisMonth, outstandingBalance, occupancyRate, occupancyHistory, leaseExpirations, latestTenants, notifications })

      // ── Commercial stats (mixed + commercial modes) ────────────
      if (isMixed || isCommercial) {
        const { data: companies } = await db.from('tenants').select('id, status').eq('organization_id', orgId!).eq('tenant_type', 'company')
        let comUnits: any[] = []
        if (comBuildingIds.length > 0) {
          const { data: cu } = await db.from('units').select('id, status').in('building_id', comBuildingIds)
          comUnits = cu ?? []
        }
        const comLeaseIds = allLeases.filter((l) => comUnits.some((u: any) => u.id === l.unit_id) && l.status === 'active')
        const comMonthlyExpected = comLeaseIds.reduce((s, l) => s + Number(l.rent_amount) + Number(l.service_charge ?? 0), 0)
        const { data: invoices } = await db.from('invoices').select('id, status, total_amount').eq('organization_id', orgId!)
        const comOverdue = (invoices ?? []).filter((i: any) => i.status === 'overdue').length
        const comCollected = (invoices ?? []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total_amount), 0)
        const comOccupied = comUnits.filter((u) => u.status === 'occupied').length
        setComData({
          totalCompanies: (companies ?? []).length,
          activeCompanies: (companies ?? []).filter((c: any) => c.status === 'active').length,
          comOccupied,
          comTotal: comUnits.length,
          comOccupancyRate: comUnits.length > 0 ? Math.round((comOccupied / comUnits.length) * 100) : 0,
          comMonthlyExpected,
          comOverdue,
          comCollected,
        })
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || typeLoading) {
    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-40 mt-2" /></div>
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-72 col-span-2 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
      </div>
    )
  }

  if (!data) return null

  const collectionRate = data.expectedMonthly > 0 ? Math.round((data.collectedThisMonth / data.expectedMonthly) * 100) : 0
  const hasAnyData = data.totalUnits > 0 || data.totalBuildings > 0

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isMixed ? 'Portfolio Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
      </div>

      {/* ── Mixed/Commercial: Combined summary bar ──────────────── */}
      {(isMixed) && comData && (
        <div className="bg-gradient-to-r from-[#1B3B6F] to-[#14b8a6] rounded-2xl p-5 text-white">
          <p className="text-sm font-semibold text-white/70 mb-3">Portfolio Overview</p>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wide font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${(data.collectedThisMonth + comData.comCollected).toLocaleString()}
              </p>
              <p className="text-xs text-white/60 mt-0.5">this month (both portfolios)</p>
            </div>
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wide font-semibold">Total Buildings</p>
              <p className="text-3xl font-bold text-white mt-1">{data.totalBuildings}</p>
              <p className="text-xs text-white/60 mt-0.5">across both portfolios</p>
            </div>
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wide font-semibold">Active Leases</p>
              <p className="text-3xl font-bold text-white mt-1">{data.activeLeases}</p>
              <p className="text-xs text-white/60 mt-0.5">{data.activeTenants} tenants · {comData.activeCompanies} companies</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Residential section header (mixed only) ─────────────── */}
      {isMixed && (
        <div className="flex items-center gap-2 -mb-4">
          <div className="p-1.5 bg-emerald-100 rounded-lg"><Home className="h-4 w-4 text-emerald-600" /></div>
          <p className="text-sm font-bold text-gray-800">Residential Portfolio</p>
          <button onClick={() => router.push('/tenants')} className="ml-auto text-xs text-emerald-600 font-medium hover:underline">
            View Tenants →
          </button>
        </div>
      )}

      {/* ── Existing residential stats cards (unchanged) ─────────── */}
      {(!isCommercial) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Buildings', value: data.totalBuildings, sub: data.totalBuildings === 0 ? 'No buildings yet' : 'Active properties', icon: Building2, iconBg: 'bg-[#0f1f3d]', iconColor: 'text-[#14b8a6]', onClick: () => router.push('/buildings') },
            { label: 'Total Units', value: data.totalUnits, sub: data.totalUnits === 0 ? 'No units yet' : `${data.occupiedUnits} Occupied · ${data.vacantUnits} Vacant`, icon: Home, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', badge: data.totalUnits > 0 ? `${data.occupancyRate}%` : null, badgeColor: 'text-teal-600 bg-teal-50', onClick: () => router.push('/buildings') },
            { label: 'Active Tenants', value: data.activeTenants, sub: `${data.activeLeases} active lease${data.activeLeases !== 1 ? 's' : ''}`, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', onClick: () => router.push('/tenants') },
            { label: 'Leases Expiring Soon', value: data.expiringCount, sub: 'Within 30 days', icon: FileText, iconBg: data.expiringCount > 0 ? 'bg-red-50' : 'bg-slate-50', iconColor: data.expiringCount > 0 ? 'text-red-500' : 'text-slate-400', alert: data.expiringCount > 0, onClick: () => router.push('/leases') },
          ].map((card: any) => (
            <div key={card.label} onClick={card.onClick} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                  {card.badge && (
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-teal-500" />
                      <span className={`text-xs font-semibold ${card.badgeColor}`}>{card.badge} occupied</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl shrink-0 ${card.iconBg} group-hover:scale-105 transition-transform`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              {card.alert && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500 font-medium">Needs attention</span>
                  <ChevronRight className="h-3 w-3 text-red-400 ml-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Commercial section (mixed + commercial modes) ─────────── */}
      {(isMixed || isCommercial) && comData && (
        <>
          {isMixed && (
            <div className="flex items-center gap-2 -mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg"><Briefcase className="h-4 w-4 text-blue-600" /></div>
              <p className="text-sm font-bold text-gray-800">Commercial Portfolio</p>
              <button onClick={() => router.push('/companies')} className="ml-auto text-xs text-blue-600 font-medium hover:underline">
                View Companies →
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Total Companies', value: comData.totalCompanies, sub: `${comData.activeCompanies} active`, icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', onClick: () => router.push('/companies') },
              { label: 'Space Occupancy', value: `${comData.comOccupancyRate}%`, sub: `${comData.comOccupied}/${comData.comTotal} spaces`, icon: TrendingUp, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', onClick: () => router.push('/buildings') },
              { label: 'Monthly Expected', value: `$${comData.comMonthlyExpected.toLocaleString()}`, sub: 'rent + service charges', icon: Receipt, iconBg: 'bg-slate-50', iconColor: 'text-slate-500', onClick: () => router.push('/invoices') },
              { label: 'Overdue Invoices', value: comData.comOverdue, sub: comData.comOverdue > 0 ? 'Need attention' : 'All clear', icon: AlertCircle, iconBg: comData.comOverdue > 0 ? 'bg-red-50' : 'bg-slate-50', iconColor: comData.comOverdue > 0 ? 'text-red-500' : 'text-slate-400', alert: comData.comOverdue > 0, onClick: () => router.push('/invoices') },
            ].map((card: any) => (
              <div key={card.label} onClick={card.onClick} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{card.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                  </div>
                  <div className={`p-3 rounded-xl shrink-0 ${card.iconBg} group-hover:scale-105 transition-transform`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
                {card.alert && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-500 font-medium">Needs attention</span>
                    <ChevronRight className="h-3 w-3 text-red-400 ml-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Charts (residential only / mixed residential section) ─── */}
      {(!isCommercial) && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Occupancy Rate</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Based on active leases vs total units — last 6 months</p>
                </div>
                {data.occupancyRate > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-lg">
                    <ArrowUpRight className="h-3.5 w-3.5 text-teal-600" />
                    <span className="text-sm font-bold text-teal-700">{data.occupancyRate}% now</span>
                  </div>
                )}
              </div>
              {!hasAnyData ? (
                <div className="flex flex-col items-center justify-center h-52 text-slate-400">
                  <Home className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm font-medium">No data yet</p>
                  <button onClick={() => router.push('/buildings')} className="mt-3 text-xs text-teal-600 hover:underline font-medium">Add your first building →</button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={data.occupancyHistory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                    <Tooltip content={<OccupancyTooltip />} />
                    <Area type="monotone" dataKey="rate" stroke="#14b8a6" strokeWidth={2.5} fill="url(#occGrad)" dot={{ fill: '#14b8a6', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Lease Expirations</h2>
              <p className="text-xs text-slate-400 mb-4">By month — 3 past + next 3</p>
              {!hasAnyData ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <FileText className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm font-medium">No leases yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={data.leaseExpirations} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip content={<ExpirationTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.leaseExpirations.map((entry, index) => (
                        <Cell key={index} fill={entry.isCurrentMonth ? '#14b8a6' : '#0f1f3d'} opacity={entry.isCurrentMonth ? 1 : 0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Latest Tenants</h2>
                <button onClick={() => router.push('/tenants')} className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-0.5">View All <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
              {data.latestTenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                  <Users className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm font-medium">No active tenants yet</p>
                  <button onClick={() => router.push('/buildings')} className="mt-3 text-xs text-teal-600 hover:underline font-medium">Go to Buildings →</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Name</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500">Unit</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500">Lease Period</th>
                        <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500">Rent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.latestTenants.map((tenant) => (
                        <tr key={tenant.id} className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push('/tenants')}>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-[#0f1f3d] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0">{tenant.avatar}</div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{tenant.name}</p>
                                <p className="text-xs text-slate-400">{tenant.building}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3"><span className="text-sm text-slate-600 font-medium">{tenant.unit}</span></td>
                          <td className="py-3 px-3"><span className="text-xs text-slate-400">{format(new Date(tenant.leaseStart), 'MMM d, yyyy')} – {tenant.leaseEnd ? format(new Date(tenant.leaseEnd), 'MMM d, yyyy') : 'Open ended'}</span></td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-slate-900 text-sm">{tenant.rent.toLocaleString()}/mo</span>
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center ${tenant.paidThisMonth ? 'bg-teal-100' : 'bg-slate-100'}`}>
                                <CheckCircle2 className={`h-3 w-3 ${tenant.paidThisMonth ? 'text-teal-600' : 'text-slate-300'}`} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Revenue — {format(new Date(), 'MMM yyyy')}</h3>
                  <button onClick={() => router.push('/payments')} className="text-xs text-teal-600 hover:underline font-medium">View all →</button>
                </div>
                {data.expectedMonthly === 0 ? (
                  <div className="py-4 text-center text-slate-400">
                    <CreditCard className="h-8 w-8 opacity-20 mx-auto mb-2" />
                    <p className="text-xs">No active leases to track revenue</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="p-2.5 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">Expected</p><p className="text-sm font-bold text-slate-900 mt-0.5">{data.expectedMonthly.toLocaleString()}</p></div>
                      <div className="p-2.5 bg-teal-50 rounded-lg"><p className="text-xs text-teal-600">Collected</p><p className="text-sm font-bold text-teal-700 mt-0.5">{data.collectedThisMonth.toLocaleString()}</p></div>
                      <div className={`p-2.5 rounded-lg ${data.outstandingBalance > 0 ? 'bg-red-50' : 'bg-slate-50'}`}><p className={`text-xs ${data.outstandingBalance > 0 ? 'text-red-400' : 'text-slate-400'}`}>Outstanding</p><p className={`text-sm font-bold mt-0.5 ${data.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400'}`}>{data.outstandingBalance.toLocaleString()}</p></div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Collection rate</span><span className={`font-bold ${collectionRate >= 100 ? 'text-teal-600' : collectionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{collectionRate}%</span></div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${collectionRate >= 100 ? 'bg-teal-500' : collectionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(collectionRate, 100)}%` }} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  <button onClick={() => router.push('/leases')} className="text-xs text-teal-600 hover:underline flex items-center gap-0.5">View All <ChevronRight className="h-3 w-3" /></button>
                </div>
                <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                  {data.notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <CheckCircle2 className="h-7 w-7 text-teal-400 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-medium text-slate-500">All clear — no alerts</p>
                    </div>
                  ) : (
                    data.notifications.map((notif) => (
                      <div key={notif.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push('/leases')}>
                        <div className="h-8 w-8 rounded-full bg-[#0f1f3d] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0">{notif.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{notif.name}</p>
                          <p className="text-xs text-slate-400 truncate">{notif.unit}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${notif.status === 'expired' ? 'bg-red-100 text-red-600' : notif.days <= 7 ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-700'}`}>
                          {notif.status === 'expired' ? `${notif.days}d ago` : `${notif.days}d left`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Add New Tenant', icon: Users, href: '/buildings' },
                    { label: 'Add New Unit', icon: Home, href: '/buildings' },
                    { label: 'Create New Lease', icon: FileText, href: '/buildings' },
                  ].map((action) => (
                    <button key={action.label} onClick={() => router.push(action.href)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0f1f3d] hover:bg-[#162d52] transition-colors">
                      <action.icon className="h-4 w-4 text-[#14b8a6] shrink-0" />
                      <span className="text-sm font-medium text-white">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
