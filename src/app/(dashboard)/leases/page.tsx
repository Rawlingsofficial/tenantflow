'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, TrendingUp, CreditCard, Clock,
  ChevronRight, AlertTriangle, DollarSign, Receipt, ArrowRightLeft
} from 'lucide-react'
import LeasesTable from '@/components/leases/LeasesTable'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import { differenceInDays, format } from 'date-fns'
import type { LeaseWithDetails } from '@/types'
import { usePropertyType } from '@/hooks/usePropertyType'
import { useMixedModeStore } from '@/store/mixedModeStore'
import { HouseIcon, BuildingIcon } from '@/components/ui/portfolio-icons'

type FilterTab = 'all' | 'active' | 'expiring_soon' | 'ended'
type Portfolio  = 'residential' | 'commercial'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const router    = useRouter()
  const supabase  = getSupabaseBrowserClient()
  const { propertyType, loading: typeLoading } = usePropertyType() // renamed from 'type'
  const { mode, setMode } = useMixedModeStore()

  const isMixed       = propertyType === 'mixed'
  const isCommercial  = propertyType === 'commercial' || (isMixed && mode === 'commercial')
  const tableMode: 'residential' | 'commercial' = isCommercial ? 'commercial' : 'residential'

  const [allLeases,    setAllLeases]    = useState<LeaseWithDetails[]>([])
  const [loading,      setLoading]      = useState(true)
  const [newLeaseOpen, setNewLeaseOpen] = useState(false)
  const [filter,       setFilter]       = useState<FilterTab>('all')
  const [search,       setSearch]       = useState('')

  useEffect(() => { if (orgId && !typeLoading) load() }, [orgId, typeLoading])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`*,
        tenants(id, first_name, last_name, primary_phone, email, photo_url,
                tenant_type, company_name, industry, contact_person),
        units(id, unit_code, unit_type, building_id,
              buildings(id, name, building_type)),
        rent_payments(id, amount, payment_date, status)`)
      .eq('organization_id', orgId!)
      .order('lease_start', { ascending: false })
    setAllLeases((data as LeaseWithDetails[]) ?? [])
    setLoading(false)
  }

  function splitByPortfolio(leases: LeaseWithDetails[]) {
    const commercial  = leases.filter(l => (l as any).units?.buildings?.building_type === 'commercial')
    const residential = leases.filter(l => (l as any).units?.buildings?.building_type !== 'commercial')
    return { commercial, residential }
  }

  const { commercial: commercialLeases, residential: residentialLeases } = splitByPortfolio(allLeases)

  const visibleLeases = isMixed
    ? (mode === 'commercial' ? commercialLeases : residentialLeases)
    : isCommercial
      ? commercialLeases
      : allLeases

  const now       = new Date()
  const thisMonth = format(now, 'yyyy-MM')

  function computeKPIs(leases: LeaseWithDetails[]) {
    const active = leases.filter(l => l.status === 'active')
    const rent   = active.reduce((s, l) => s + Number(l.rent_amount), 0)
    const sc     = active.reduce((s, l) => s + Number((l as any).service_charge ?? 0), 0)
    const allPays = leases.flatMap(l => (l as any).rent_payments ?? [])
    const collected = allPays
      .filter((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
      .reduce((s: number, p: any) => s + Number(p.amount), 0)
    const unpaid = active.filter(l => {
      const pays = (l as any).rent_payments ?? []
      return !pays.some((p: any) => p.status === 'completed' && p.payment_date?.startsWith(thisMonth))
    }).length
    const expiring = active.filter(l => {
      if (!l.lease_end) return false
      const d = differenceInDays(new Date(l.lease_end), now)
      return d >= 0 && d <= 30
    })
    const expired = active.filter(l => {
      if (!l.lease_end) return false
      return differenceInDays(new Date(l.lease_end), now) < 0
    })
    return { active, rent, sc, total: rent + sc, collected, unpaid, expiring, expired }
  }

  const kpi     = computeKPIs(visibleLeases)
  const resKPI  = isMixed ? computeKPIs(residentialLeases) : null
  const comKPI  = isMixed ? computeKPIs(commercialLeases)  : null

  // KPI card definitions
  const residentialKPICards = [
    {
      metric: `$${kpi.total.toLocaleString()}`,
      metricSub: `${kpi.active.length} active leases`,
      title: 'Track & Manage Rent',
      subtitle: kpi.unpaid > 0
        ? `${kpi.unpaid} tenant${kpi.unpaid > 1 ? 's' : ''} unpaid this month`
        : 'All paid this month ✓',
      subtitleColor: kpi.unpaid > 0 ? 'text-amber-600' : 'text-teal-600',
      gradient: 'from-[#1B3B6F] to-[#2a4f8f]',
      icon: TrendingUp, href: '/leases/rent-tracker',
    },
    {
      metric: `$${kpi.collected.toLocaleString()}`,
      metricSub: 'collected this month',
      title: 'Rent Payments',
      subtitle: kpi.total - kpi.collected > 0
        ? `$${(kpi.total - kpi.collected).toLocaleString()} outstanding`
        : 'Fully collected ✓',
      subtitleColor: kpi.total - kpi.collected > 0 ? 'text-amber-600' : 'text-teal-600',
      gradient: 'from-teal-500 to-teal-600',
      icon: CreditCard, href: '/leases/rent-tracker',
    },
    {
      metric: String(kpi.expiring.length),
      metricSub: 'expiring in 30 days',
      title: 'Lease Expirations',
      subtitle: kpi.expiring.length === 0 && kpi.expired.length === 0
        ? 'No expirations soon ✓'
        : `${kpi.expired.length > 0 ? `${kpi.expired.length} overdue · ` : ''}Action needed`,
      subtitleColor: kpi.expiring.length > 0 || kpi.expired.length > 0 ? 'text-amber-600' : 'text-teal-600',
      gradient: 'from-[#0d9488] to-teal-400',
      icon: Clock, href: '/leases',
    },
  ]

  const commercialKPICards = [
    {
      metric: `$${kpi.rent.toLocaleString()}`,
      metricSub: 'base rent/mo',
      title: 'Monthly Rent',
      subtitle: `${kpi.active.length} active commercial lease${kpi.active.length !== 1 ? 's' : ''}`,
      subtitleColor: 'text-slate-400',
      gradient: 'from-[#1B3B6F] to-[#2a4f8f]',
      icon: DollarSign, href: '/leases',
    },
    {
      metric: `$${kpi.sc.toLocaleString()}`,
      metricSub: 'service charges/mo',
      title: 'Service Charges',
      subtitle: `Total monthly: $${kpi.total.toLocaleString()}`,
      subtitleColor: 'text-teal-600',
      gradient: 'from-teal-500 to-[#0d9488]',
      icon: Receipt, href: '/invoices',
    },
    {
      metric: String(kpi.expiring.length),
      metricSub: 'expiring in 30 days',
      title: 'Lease Expirations',
      subtitle: kpi.expiring.length === 0 && kpi.expired.length === 0
        ? 'No expirations soon ✓'
        : 'Action needed',
      subtitleColor: kpi.expiring.length > 0 || kpi.expired.length > 0 ? 'text-amber-600' : 'text-teal-600',
      gradient: 'from-[#0d9488] to-teal-400',
      icon: Clock, href: '/leases',
    },
  ]

  const kpiCards = isCommercial ? commercialKPICards : residentialKPICards

  const filtered = visibleLeases.filter(l => {
    const q  = search.toLowerCase()
    const t  = (l as any).tenants
    const u  = (l as any).units
    const isC = t?.tenant_type === 'company'
    const name = isC
      ? (t?.company_name ?? '').toLowerCase()
      : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    if (q && !name.includes(q) && !(u?.unit_code ?? '').toLowerCase().includes(q) && !(u?.buildings?.name ?? '').toLowerCase().includes(q)) return false
    if (filter === 'active') return l.status === 'active'
    if (filter === 'expiring_soon') return kpi.expiring.some(e => e.id === l.id) || kpi.expired.some(e => e.id === l.id)
    if (filter === 'ended') return l.status === 'ended' || l.status === 'terminated'
    return true
  })

  const tabs: { label: string; value: FilterTab; count: number }[] = [
    { label: 'All',           value: 'all',           count: visibleLeases.length },
    { label: 'Active',        value: 'active',        count: kpi.active.length },
    { label: 'Expiring Soon', value: 'expiring_soon', count: kpi.expiring.length + kpi.expired.length },
    { label: 'Ended',         value: 'ended',         count: visibleLeases.filter(l => l.status !== 'active').length },
  ]

  if (typeLoading) return (
    <div className="min-h-screen bg-slate-50/70 p-6 space-y-6">
      <Skeleton className="h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/70">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="px-6 pt-6 pb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leases</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {kpi.active.length} active · ${kpi.total.toLocaleString()}/mo
            {isMixed && (
              <span className={`ml-2 font-semibold ${mode === 'commercial' ? 'text-[#1B3B6F]' : 'text-teal-600'}`}>
                · {mode === 'commercial' ? 'Commercial' : 'Residential'} portfolio
              </span>
            )}
            {!isMixed && propertyType === 'commercial' && <span className="ml-2 text-[#1B3B6F] font-semibold">· Commercial</span>}
          </p>
        </div>
        <Button onClick={() => setNewLeaseOpen(true)}
          className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl gap-1.5 px-4 shadow-sm">
          <Plus className="h-3.5 w-3.5" /> New Lease
        </Button>
      </motion.div>

      {/* Mixed portfolio switcher */}
      {isMixed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="px-6 mb-4"
        >
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-2xl p-1 shadow-sm w-fit">
            {(['residential', 'commercial'] as Portfolio[]).map(p => (
              <button key={p} onClick={() => setMode(p)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === p
                    ? p === 'commercial'
                      ? 'bg-[#1B3B6F] text-white shadow-sm'
                      : 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {p === 'residential'
                  ? <HouseIcon className="w-3.5 h-3.5" />
                  : <BuildingIcon className="w-3.5 h-3.5" />}
                {p.charAt(0).toUpperCase() + p.slice(1)}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                  mode === p ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {p === 'residential' ? residentialLeases.length : commercialLeases.length}
                </span>
              </button>
            ))}
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <div className="px-3 py-1 flex items-center gap-1 text-xs text-slate-400">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Mixed portfolio
            </div>
          </div>

          {/* Overview strip */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              {
                label: 'Residential',
                icon: 'house',
                active: resKPI!.active.length,
                total: resKPI!.total,
                unpaid: resKPI!.unpaid,
                border: 'border-teal-200',
                bg: 'bg-teal-50/50',
                activeColor: 'text-teal-700',
                iconBg: 'bg-teal-500/10',
              },
              {
                label: 'Commercial',
                icon: 'building',
                active: comKPI!.active.length,
                total: comKPI!.total,
                unpaid: comKPI!.unpaid,
                border: 'border-[#1B3B6F]/20',
                bg: 'bg-[#1B3B6F]/4',
                activeColor: 'text-[#1B3B6F]',
                iconBg: 'bg-[#1B3B6F]/8',
              },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                    {s.icon === 'house'
                      ? <HouseIcon    className={`w-3.5 h-3.5 ${s.activeColor}`} />
                      : <BuildingIcon className={`w-3.5 h-3.5 ${s.activeColor}`} />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600">{s.label}</p>
                    <p className={`text-lg font-bold tabular-nums ${s.activeColor}`}>{s.active} active</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 tabular-nums">${s.total.toLocaleString()}/mo</p>
                  {s.unpaid > 0 && <p className="text-[10px] text-amber-600 font-semibold">{s.unpaid} unpaid</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI cards */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-5">
        {kpiCards.map((card, i) => (
          <motion.button key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (isMixed ? 0.15 : 0) + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => router.push(card.href)}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow group"
          >
            <div className={`h-24 bg-gradient-to-br ${card.gradient} p-4 flex items-center justify-between`}>
              <div>
                <p className="text-xs text-white/70 font-medium uppercase tracking-wider">
                  {isCommercial ? 'Monthly' : 'Expected'}
                </p>
                <p className="text-2xl font-bold text-white tabular-nums">{card.metric}</p>
                <p className="text-xs text-white/70 mt-0.5">{card.metricSub}</p>
              </div>
              <card.icon className="h-9 w-9 text-white/20" />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                <p className={`text-xs mt-0.5 font-medium ${card.subtitleColor}`}>{card.subtitle}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="px-6 flex items-center justify-between">
        <div className="flex items-center gap-0.5 border-b border-slate-200">
          {tabs.map(tab => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={isCommercial ? 'Search companies, spaces…' : 'Search tenants, units…'}
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 w-56 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400/25"
          />
        </div>
      </div>

      {/* Alerts */}
      {(kpi.expired.length > 0 || kpi.expiring.length > 0) && filter !== 'expiring_soon' && (
        <div className="px-6 pt-3 space-y-2">
          {kpi.expired.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              <span className="text-red-800">
                <strong>{kpi.expired.length}</strong> lease{kpi.expired.length > 1 ? 's' : ''} expired but still marked active
              </span>
              <button onClick={() => setFilter('expiring_soon')} className="ml-auto text-xs text-red-700 font-semibold underline">Resolve</button>
            </motion.div>
          )}
          {kpi.expiring.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
              className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-amber-800"><strong>{kpi.expiring.length}</strong> expiring within 30 days</span>
              <button onClick={() => setFilter('expiring_soon')} className="ml-auto text-xs text-amber-700 font-semibold underline">View</button>
            </motion.div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="px-6 pb-8 mt-0">
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <LeasesTable
              leases={filtered}
              onViewDetail={lease => router.push(`/leases/${lease.id}`)}
              mode={tableMode}
            />
          )}
        </div>
      </div>

      <AssignTenantDialog
        open={newLeaseOpen}
        onClose={() => setNewLeaseOpen(false)}
        onSaved={() => { setNewLeaseOpen(false); load() }}
        unit={null}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}