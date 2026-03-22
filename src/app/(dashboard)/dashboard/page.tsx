'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Receipt, Briefcase, Calendar, AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { usePropertyType } from '@/hooks/usePropertyType'

// ── Types ──────────────────────────────────────────────────────
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

// ── Animated ticker ────────────────────────────────────────────
function Ticker({ value, prefix = '', duration = 1000 }: { value: number | string; prefix?: string; duration?: number }) {
  const numVal = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (isNaN(numVal)) return
    start.current = null
    function step(ts: number) {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(numVal * eased))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [numVal])

  if (typeof value === 'string' && value.includes('%')) return <>{display}%</>
  return <>{prefix}{display.toLocaleString()}</>
}

// ── Spotlight card ─────────────────────────────────────────────
function SpotlightCard({ children, className = '', onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: '50%', y: '50%' })
  const [hovered, setHovered] = useState(false)
  function handleMove(e: React.MouseEvent) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: `${e.clientX - r.left}px`, y: `${e.clientY - r.top}px` })
  }
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)} onClick={onClick}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10 rounded-2xl"
        style={{ opacity: hovered ? 1 : 0, background: `radial-gradient(280px circle at ${pos.x} ${pos.y}, rgba(20,184,166,0.07), transparent 60%)` }} />
      {children}
    </div>
  )
}

// ── Custom chart tooltips ──────────────────────────────────────
function OccupancyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-teal-600 font-bold">{payload[0]?.value}% occupancy</p>
      {payload[0]?.payload?.occupied !== undefined && (
        <p className="text-slate-400 mt-0.5">{payload[0].payload.occupied} occupied · {payload[0].payload.vacant} vacant</p>
      )}
    </div>
  )
}
function ExpirationTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-[#1B3B6F] font-bold">{payload[0]?.value} lease{payload[0]?.value !== 1 ? 's' : ''} expiring</p>
    </div>
  )
}

// ── Stat card (reusable for both res + com) ────────────────────
function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, accentFrom, badge, badgeColor, alert, onClick, delay = 0 }: {
  label: string; value: number | string; sub: string; icon: any
  iconBg: string; iconColor: string; accentFrom: string
  badge?: string | null; badgeColor?: string
  alert?: boolean; onClick?: () => void; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <SpotlightCard
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        onClick={onClick}
      >
        <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accentFrom} to-transparent pointer-events-none rounded-t-2xl`} />
        <div className="relative z-20 p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            {alert ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200/70 rounded-lg">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Alert</span>
              </div>
            ) : onClick ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300" />
            ) : null}
          </div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
          <p className="text-3xl font-bold text-slate-900 leading-none tabular-nums">
            <Ticker value={value} />
          </p>
          <p className="text-xs text-slate-400 mt-2">{sub}</p>
          {badge && (
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
              <TrendingUp className="h-3 w-3 text-teal-500" />
              <span className={`text-xs font-semibold ${badgeColor ?? 'text-teal-600'}`}>{badge}</span>
            </div>
          )}
          {alert && (
            <div className="mt-3 pt-3 border-t border-amber-100/60">
              <span className="text-xs text-amber-600 font-medium">Needs attention →</span>
            </div>
          )}
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { type, loading: typeLoading } = usePropertyType()
  const [data, setData] = useState<DashboardState | null>(null)
  const [comData, setComData] = useState<CommercialStats | null>(null)
  const [loading, setLoading] = useState(true)

  const isMixed      = type === 'mixed'
  const isCommercial = type === 'commercial'

  useEffect(() => {
    if (orgId && !typeLoading) loadDashboard()
  }, [orgId, typeLoading])

  async function loadDashboard() {
    setLoading(true)
    try {
      const db = supabase as any
      const now = new Date()

      const { data: buildings } = await db
        .from('buildings').select('id, building_type')
        .eq('organization_id', orgId!).eq('status', 'active')

      const allBuildings = buildings ?? []
      const resBuildingIds = allBuildings.filter((b: any) => b.building_type !== 'commercial').map((b: any) => b.id)
      const comBuildingIds = allBuildings.filter((b: any) => b.building_type === 'commercial').map((b: any) => b.id)
      const effectiveBuildingIds = isCommercial ? comBuildingIds : (isMixed ? resBuildingIds : allBuildings.map((b: any) => b.id))

      const { data: units } = await db.from('units').select('id, status')
        .in('building_id', effectiveBuildingIds.length > 0 ? effectiveBuildingIds : ['none'])
      const allUnits: any[] = units ?? []
      const totalUnits    = allUnits.length
      const occupiedUnits = allUnits.filter((u) => u.status === 'occupied').length
      const vacantUnits   = allUnits.filter((u) => u.status === 'vacant').length
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

      const { data: tenants } = await db.from('tenants').select('id')
        .eq('organization_id', orgId!).eq('status', 'active').eq('tenant_type', 'individual')

      const { data: leases } = await db.from('leases')
        .select(`id, status, rent_amount, lease_start, lease_end, tenant_id, unit_id,
          tenants(id, first_name, last_name),
          units(unit_code, buildings(name)),
          rent_payments(amount, payment_date, status)`)
        .eq('organization_id', orgId!).order('lease_start', { ascending: false })

      const allLeases: any[] = leases ?? []
      const resUnitIds = new Set(allUnits.map((u: any) => u.id))
      const activeLeases = allLeases.filter((l) => l.status === 'active' && resUnitIds.has(l.unit_id))

      const today = now.toISOString().split('T')[0]
      const in30  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const expiring = activeLeases.filter((l) => l.lease_end && l.lease_end >= today && l.lease_end <= in30)
      const expired  = activeLeases.filter((l) => l.lease_end && l.lease_end < today)

      const expectedMonthly    = activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)
      const collectedThisMonth = activeLeases.reduce((sum, l) => {
        return sum + (l.rent_payments ?? []).filter((p: any) =>
          p.status === 'completed' && isSameMonth(new Date(p.payment_date), now)
        ).reduce((s: number, p: any) => s + Number(p.amount), 0)
      }, 0)
      const outstandingBalance = Math.max(0, expectedMonthly - collectedThisMonth)

      const occupancyHistory: OccupancyPoint[] = Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(now, 5 - i)
        const monthStart = startOfMonth(month).toISOString().split('T')[0]
        const monthEnd   = endOfMonth(month).toISOString().split('T')[0]
        const active     = allLeases.filter((l) => l.lease_start <= monthEnd && (!l.lease_end || l.lease_end >= monthStart)).length
        const rate       = totalUnits > 0 ? Math.min(100, Math.round((Math.min(active, totalUnits) / totalUnits) * 100)) : 0
        const occ        = Math.min(active, totalUnits)
        return { month: format(month, 'MMM'), occupied: occ, vacant: Math.max(0, totalUnits - occ), rate }
      })

      const leaseExpirations: ExpirationPoint[] = Array.from({ length: 6 }, (_, i) => {
        const month      = subMonths(now, 2 - i)
        const monthStart = startOfMonth(month).toISOString().split('T')[0]
        const monthEnd   = endOfMonth(month).toISOString().split('T')[0]
        return {
          month: format(month, 'MMM yyyy'),
          count: allLeases.filter((l) => l.lease_end && l.lease_end >= monthStart && l.lease_end <= monthEnd).length,
          isCurrentMonth: isSameMonth(month, now),
        }
      })

      const latestTenants: TenantRow[] = activeLeases.slice(0, 5).map((l: any) => {
        const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
        const paid = (l.rent_payments ?? []).filter((p: any) =>
          p.status === 'completed' && isSameMonth(new Date(p.payment_date), now)
        ).reduce((s: number, p: any) => s + Number(p.amount), 0) >= Number(l.rent_amount)
        return { id: l.id, name: name || 'Unknown', unit: l.units?.unit_code ?? '—', building: l.units?.buildings?.name ?? '—', leaseStart: l.lease_start, leaseEnd: l.lease_end, rent: Number(l.rent_amount), paidThisMonth: paid, avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase() }
      })

      const notifications: NotifRow[] = [
        ...expired.slice(0, 3).map((l: any) => ({ id: l.id, name: `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim() || 'Unknown', unit: `${l.units?.unit_code ?? '—'} · ${l.units?.buildings?.name ?? ''}`, status: 'expired' as const, days: Math.abs(differenceInDays(new Date(l.lease_end!), now)), avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase() })),
        ...expiring.slice(0, 4).map((l: any) => ({ id: l.id, name: `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim() || 'Unknown', unit: `${l.units?.unit_code ?? '—'} · ${l.units?.buildings?.name ?? ''}`, status: 'expiring' as const, days: differenceInDays(new Date(l.lease_end!), now), avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase() })),
      ].slice(0, 5)

      setData({ totalBuildings: allBuildings.length, totalUnits, occupiedUnits, vacantUnits, activeTenants: (tenants ?? []).length, expiringCount: expiring.length, activeLeases: activeLeases.length, expectedMonthly, collectedThisMonth, outstandingBalance, occupancyRate, occupancyHistory, leaseExpirations, latestTenants, notifications })

      // ── Commercial stats ───────────────────────────────────────
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
        const comOverdue   = (invoices ?? []).filter((i: any) => i.status === 'overdue').length
        const comCollected = (invoices ?? []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total_amount), 0)
        const comOccupied  = comUnits.filter((u) => u.status === 'occupied').length
        setComData({
          totalCompanies: (companies ?? []).length,
          activeCompanies: (companies ?? []).filter((c: any) => c.status === 'active').length,
          comOccupied, comTotal: comUnits.length,
          comOccupancyRate: comUnits.length > 0 ? Math.round((comOccupied / comUnits.length) * 100) : 0,
          comMonthlyExpected, comOverdue, comCollected,
        })
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading || typeLoading) {
    return (
      <div className="p-6 space-y-6 min-h-screen bg-slate-50/70">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-7 w-40 rounded-xl" /><Skeleton className="h-4 w-52 rounded-xl" /></div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-72 col-span-2 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-60 col-span-2 rounded-2xl" /><div className="space-y-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div></div>
      </div>
    )
  }

  if (!data) return null

  const collectionRate = data.expectedMonthly > 0 ? Math.round((data.collectedThisMonth / data.expectedMonthly) * 100) : 0
  const hasAnyData = data.totalUnits > 0 || data.totalBuildings > 0

  const rateColor = collectionRate >= 100 ? { bar: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50' }
    : collectionRate >= 50 ? { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }
    : { bar: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-50' }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50/70">

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isMixed ? 'Portfolio Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {data.occupancyRate > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Occupancy</span>
            <span className="text-sm font-bold text-teal-700 tabular-nums">{data.occupancyRate}%</span>
            <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
          </div>
        )}
      </motion.div>

      {/* ── Mixed: portfolio summary banner ─────────────────── */}
      {isMixed && comData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="relative bg-gradient-to-r from-[#1B3B6F] to-[#0d9488] rounded-2xl p-5 text-white overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-4 -bottom-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Portfolio Overview</p>
          <div className="grid grid-cols-3 gap-6 relative z-10">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                ${(data.collectedThisMonth + comData.comCollected).toLocaleString()}
              </p>
              <p className="text-xs text-white/50 mt-0.5">this month · both portfolios</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide font-semibold">Total Buildings</p>
              <p className="text-3xl font-bold text-white mt-1">{data.totalBuildings}</p>
              <p className="text-xs text-white/50 mt-0.5">across both portfolios</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide font-semibold">Active Leases</p>
              <p className="text-3xl font-bold text-white mt-1">{data.activeLeases}</p>
              <p className="text-xs text-white/50 mt-0.5">{data.activeTenants} tenants · {comData.activeCompanies} companies</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Residential stats ────────────────────────────────── */}
      {!isCommercial && (
        <>
          {isMixed && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 rounded-lg"><Home className="h-4 w-4 text-teal-600" /></div>
              <p className="text-sm font-bold text-slate-800">Residential Portfolio</p>
              <button onClick={() => router.push('/tenants')} className="ml-auto text-xs text-teal-600 font-medium hover:underline flex items-center gap-0.5">
                View Tenants <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Buildings" value={data.totalBuildings} sub={data.totalBuildings === 0 ? 'No buildings yet' : 'Active properties'}
              icon={Building2} iconBg="bg-[#1B3B6F]" iconColor="text-[#14b8a6]" accentFrom="from-[#1B3B6F]/6"
              onClick={() => router.push('/buildings')} delay={0} />
            <StatCard label="Total Units" value={data.totalUnits} sub={data.totalUnits === 0 ? 'No units yet' : `${data.occupiedUnits} occupied · ${data.vacantUnits} vacant`}
              icon={Home} iconBg="bg-teal-500/10" iconColor="text-teal-600" accentFrom="from-teal-500/5"
              badge={data.totalUnits > 0 ? `${data.occupancyRate}% occupancy` : null} badgeColor="text-teal-600"
              onClick={() => router.push('/buildings')} delay={0.07} />
            <StatCard label="Active Tenants" value={data.activeTenants} sub={`${data.activeLeases} active lease${data.activeLeases !== 1 ? 's' : ''}`}
              icon={Users} iconBg="bg-blue-500/10" iconColor="text-blue-600" accentFrom="from-blue-500/5"
              onClick={() => router.push('/tenants')} delay={0.14} />
            <StatCard label="Expiring Soon" value={data.expiringCount} sub="Within 30 days"
              icon={FileText} iconBg={data.expiringCount > 0 ? 'bg-amber-500/10' : 'bg-slate-100'} iconColor={data.expiringCount > 0 ? 'text-amber-600' : 'text-slate-400'}
              accentFrom={data.expiringCount > 0 ? 'from-amber-500/6' : 'from-slate-200/20'}
              alert={data.expiringCount > 0}
              onClick={() => router.push('/leases')} delay={0.21} />
          </div>
        </>
      )}

      {/* ── Commercial stats ─────────────────────────────────── */}
      {(isMixed || isCommercial) && comData && (
        <>
          {isMixed && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg"><Briefcase className="h-4 w-4 text-blue-600" /></div>
              <p className="text-sm font-bold text-slate-800">Commercial Portfolio</p>
              <button onClick={() => router.push('/companies')} className="ml-auto text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5">
                View Companies <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Companies" value={comData.totalCompanies} sub={`${comData.activeCompanies} active`}
              icon={Building2} iconBg="bg-blue-500/10" iconColor="text-blue-600" accentFrom="from-blue-500/5"
              onClick={() => router.push('/companies')} delay={0} />
            <StatCard label="Space Occupancy" value={`${comData.comOccupancyRate}%`} sub={`${comData.comOccupied}/${comData.comTotal} spaces`}
              icon={TrendingUp} iconBg="bg-teal-500/10" iconColor="text-teal-600" accentFrom="from-teal-500/5"
              onClick={() => router.push('/buildings')} delay={0.07} />
            <StatCard label="Monthly Expected" value={comData.comMonthlyExpected} sub="rent + service charges"
              icon={Receipt} iconBg="bg-slate-100" iconColor="text-slate-500" accentFrom="from-slate-200/20"
              onClick={() => router.push('/invoices')} delay={0.14} />
            <StatCard label="Overdue Invoices" value={comData.comOverdue} sub={comData.comOverdue > 0 ? 'Need attention' : 'All clear'}
              icon={AlertCircle} iconBg={comData.comOverdue > 0 ? 'bg-amber-500/10' : 'bg-slate-100'} iconColor={comData.comOverdue > 0 ? 'text-amber-600' : 'text-slate-400'}
              accentFrom={comData.comOverdue > 0 ? 'from-amber-500/5' : 'from-slate-200/20'}
              alert={comData.comOverdue > 0}
              onClick={() => router.push('/invoices')} delay={0.21} />
          </div>
        </>
      )}

      {/* ── Charts (residential only / mixed res section) ─────── */}
      {!isCommercial && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Occupancy area chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-2 relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-teal-500/4 to-transparent pointer-events-none" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trend</p>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">Occupancy Rate</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Based on active leases · last 6 months</p>
                  </div>
                  {data.occupancyRate > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-xl">
                      <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
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
                          <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                        <filter id="lineGlow">
                          <feGaussianBlur stdDeviation="2.5" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                      <Tooltip content={<OccupancyTooltip />} />
                      <Area type="monotone" dataKey="rate" stroke="#14b8a6" strokeWidth={2.5} fill="url(#occGrad)"
                        dot={{ fill: '#14b8a6', strokeWidth: 2, stroke: '#fff', r: 4 }}
                        activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                        filter="url(#lineGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            {/* Lease expirations bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#1B3B6F]/4 to-transparent pointer-events-none" />
              <div className="relative p-5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Schedule</p>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">Lease Expirations</h2>
                <p className="text-xs text-slate-400 mb-4">3 past + next 3 months</p>
                {!hasAnyData ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <FileText className="h-10 w-10 opacity-20 mb-3" />
                    <p className="text-sm font-medium">No leases yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={data.leaseExpirations} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1B3B6F" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#1B3B6F" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                      <Tooltip content={<ExpirationTooltip />} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={36}>
                        {data.leaseExpirations.map((entry, index) => (
                          <Cell key={index} fill={entry.isCurrentMonth ? '#14b8a6' : 'url(#barGrad)'} opacity={entry.isCurrentMonth ? 1 : 0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Bottom row ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Latest tenants */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active</p>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">Latest Tenants</h3>
                </div>
                <button onClick={() => router.push('/tenants')} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium group">
                  View all <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              {data.latestTenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">No active tenants yet</p>
                  <button onClick={() => router.push('/buildings')} className="mt-3 text-xs text-teal-600 hover:underline font-medium">Go to Buildings →</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tenant</th>
                        <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
                        <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Period</th>
                        <th className="text-right py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.latestTenants.map((tenant, i) => (
                        <motion.tr
                          key={tenant.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.35 + i * 0.04 }}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 cursor-pointer transition-colors group"
                          onClick={() => router.push('/tenants')}
                        >
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] text-[#14b8a6] text-xs font-bold shrink-0 shadow-sm">
                                {tenant.avatar}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">{tenant.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{tenant.building}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">{tenant.unit}</span>
                          </td>
                          <td className="py-3 px-3 hidden sm:table-cell">
                            <span className="text-xs text-slate-400">
                              {format(new Date(tenant.leaseStart), 'MMM d, yyyy')} – {tenant.leaseEnd ? format(new Date(tenant.leaseEnd), 'MMM d, yyyy') : <span className="text-teal-600 font-medium">Open-ended</span>}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm font-bold text-slate-900 tabular-nums">
                                ${tenant.rent.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span>
                              </span>
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${tenant.paidThisMonth ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                                <CheckCircle2 className={`h-3 w-3 ${tenant.paidThisMonth ? 'text-teal-500' : 'text-slate-300'}`} />
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Revenue mini-card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/4 to-transparent pointer-events-none" />
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</p>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{format(new Date(), 'MMM yyyy')}</h3>
                    </div>
                    <button onClick={() => router.push('/payments')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">View all →</button>
                  </div>
                  {data.expectedMonthly === 0 ? (
                    <div className="py-4 text-center text-slate-400">
                      <CreditCard className="h-7 w-7 opacity-20 mx-auto mb-2" />
                      <p className="text-xs">No active leases</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2 bg-slate-50 rounded-xl">
                          <p className="text-[10px] text-slate-400 font-medium">Expected</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">${data.expectedMonthly.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-teal-50 rounded-xl">
                          <p className="text-[10px] text-teal-600 font-medium">Collected</p>
                          <p className="text-xs font-bold text-teal-700 mt-0.5 tabular-nums">${data.collectedThisMonth.toLocaleString()}</p>
                        </div>
                        <div className={`p-2 rounded-xl ${data.outstandingBalance > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                          <p className={`text-[10px] font-medium ${data.outstandingBalance > 0 ? 'text-red-400' : 'text-slate-400'}`}>Outstanding</p>
                          <p className={`text-xs font-bold mt-0.5 tabular-nums ${data.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400'}`}>${data.outstandingBalance.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Collection rate</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] ${rateColor.bg} ${rateColor.text}`}>{collectionRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${rateColor.bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(collectionRate, 100)}%` }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Notifications */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.37, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {data.notifications.length > 0 && (
                      <span className="flex items-center justify-center h-4 w-4 bg-red-500 rounded-full text-white text-[9px] font-bold">
                        {data.notifications.length}
                      </span>
                    )}
                    <button onClick={() => router.push('/leases')} className="text-slate-400 hover:text-slate-600">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                  {data.notifications.length === 0 ? (
                    <div className="px-4 py-7 text-center">
                      <div className="w-9 h-9 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-500" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">All clear</p>
                    </div>
                  ) : (
                    data.notifications.map((notif, i) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + i * 0.04 }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => router.push('/leases')}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] text-[#14b8a6] text-xs font-bold shrink-0">
                          {notif.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">{notif.name}</p>
                          <p className="text-xs text-slate-400 truncate">{notif.unit}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          notif.status === 'expired' ? 'bg-red-100 text-red-600'
                          : notif.days <= 7 ? 'bg-orange-100 text-orange-600'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {notif.status === 'expired' ? `${notif.days}d ago` : `${notif.days}d`}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4"
              >
                <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Add New Tenant', icon: Users, href: '/buildings', shimmer: 'via-teal-400/8' },
                    { label: 'Add New Unit', icon: Home, href: '/buildings', shimmer: 'via-[#1B3B6F]/8' },
                    { label: 'Create New Lease', icon: FileText, href: '/buildings', shimmer: 'via-violet-400/8' },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => router.push(action.href)}
                      className="group relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200 overflow-hidden text-left"
                    >
                      <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent ${action.shimmer} to-transparent transition-transform duration-700`} />
                      <div className="relative z-10 w-7 h-7 rounded-lg bg-[#1B3B6F]/8 flex items-center justify-center">
                        <action.icon className="h-3.5 w-3.5 text-[#1B3B6F]" />
                      </div>
                      <span className="relative z-10 text-sm font-medium text-slate-700">{action.label}</span>
                      <ArrowRight className="relative z-10 h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all ml-auto" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
