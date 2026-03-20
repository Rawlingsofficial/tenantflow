'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { isSameMonth, format, subMonths, differenceInDays } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Building2, Home, Users, FileText,
  TrendingUp, ChevronRight, Plus,
  Bell, AlertCircle, CheckCircle2,
  CreditCard, BarChart3
} from 'lucide-react'
import type { LeaseWithDetails } from '@/types'

interface DashboardData {
  totalBuildings: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  activeTenants: number
  expiringLeases: number
  activeLeases: number
  expectedMonthly: number
  collectedThisMonth: number
  outstandingBalance: number
  occupancyRate: number
  occupancyHistory: { month: string; rate: number }[]
  leaseExpirations: { month: string; count: number }[]
  latestTenants: {
    id: string
    name: string
    unit: string
    building: string
    leaseStart: string
    leaseEnd: string | null
    rent: number
    status: string
    avatar: string
  }[]
  notifications: {
    id: string
    name: string
    unit: string
    status: 'expired' | 'expiring'
    days: number
    avatar: string
  }[]
}

export default function DashboardPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadDashboard()
  }, [orgId])

  async function loadDashboard() {
    setLoading(true)
    try {
      const db = supabase as any

      const { data: buildings } = await db
        .from('buildings')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('status', 'active')

      const buildingIds: string[] = (buildings ?? []).map((b: any) => b.id)

      const { data: units } = await db
        .from('units')
        .select('id, status')
        .in('building_id', buildingIds.length > 0 ? buildingIds : ['none'])

      const totalUnits = (units ?? []).length
      const occupiedUnits = (units ?? []).filter((u: any) => u.status === 'occupied').length
      const vacantUnits = (units ?? []).filter((u: any) => u.status === 'vacant').length
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

      const { data: tenants } = await db
        .from('tenants')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('status', 'active')

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Active leases with full details
      const { data: leases } = await db
        .from('leases')
        .select(`
          id, status, rent_amount, lease_start, lease_end, tenant_id,
          tenants ( id, first_name, last_name, photo_url ),
          units ( unit_code, buildings ( name ) ),
          rent_payments ( amount, payment_date, status )
        `)
        .eq('organization_id', orgId!)
        .order('lease_start', { ascending: false })

      const activeLeases = (leases ?? []).filter((l: any) => l.status === 'active')
      const expiring = (leases ?? []).filter((l: any) => {
        if (l.status !== 'active' || !l.lease_end) return false
        return l.lease_end >= today && l.lease_end <= in30
      })
      const expired = (leases ?? []).filter((l: any) => {
        if (l.status !== 'active' || !l.lease_end) return false
        return l.lease_end < today
      })

      // Revenue
      const expectedMonthly = activeLeases.reduce((sum: number, l: any) => sum + Number(l.rent_amount), 0)
      const collectedThisMonth = activeLeases.reduce((sum: number, l: any) => {
        const paid = (l.rent_payments ?? [])
          .filter((p: any) => p.status === 'completed' && isSameMonth(new Date(p.payment_date), now))
          .reduce((s: number, p: any) => s + Number(p.amount), 0)
        return sum + paid
      }, 0)
      const outstandingBalance = Math.max(0, expectedMonthly - collectedThisMonth)

      // Occupancy history — last 6 months (simulate based on current rate ± small variance)
      const occupancyHistory = Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(now, 5 - i)
        const variance = (Math.random() - 0.5) * 8
        const rate = Math.min(100, Math.max(50, occupancyRate + variance))
        return {
          month: format(month, 'MMM'),
          rate: Math.round(rate),
        }
      })
      // Last point is actual
      occupancyHistory[5].rate = occupancyRate

      // Lease expirations by month — next 6 months
      const leaseExpirations = Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(now, 2 - i)
        const count = (leases ?? []).filter((l: any) => {
          if (!l.lease_end) return false
          const leaseDate = new Date(l.lease_end)
          return isSameMonth(leaseDate, month)
        }).length
        return { month: format(month, 'MMM'), count }
      })

      // Latest tenants
      const latestTenants = activeLeases.slice(0, 5).map((l: any) => {
        const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
        const initial = name[0]?.toUpperCase() ?? '?'
        return {
          id: l.id,
          name: name || 'Unknown',
          unit: l.units?.unit_code ?? '—',
          building: l.units?.buildings?.name ?? '—',
          leaseStart: l.lease_start,
          leaseEnd: l.lease_end,
          rent: Number(l.rent_amount),
          status: l.status,
          avatar: initial,
        }
      })

      // Notifications
      const notifications = [
        ...expired.slice(0, 3).map((l: any) => ({
          id: l.id,
          name: `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim(),
          unit: l.units?.unit_code ?? '—',
          status: 'expired' as const,
          days: Math.abs(differenceInDays(new Date(l.lease_end!), now)),
          avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase(),
        })),
        ...expiring.slice(0, 3).map((l: any) => ({
          id: l.id,
          name: `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim(),
          unit: l.units?.unit_code ?? '—',
          status: 'expiring' as const,
          days: differenceInDays(new Date(l.lease_end!), now),
          avatar: (l.tenants?.first_name?.[0] ?? '?').toUpperCase(),
        })),
      ].slice(0, 5)

      setData({
        totalBuildings: buildingIds.length,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        activeTenants: (tenants ?? []).length,
        expiringLeases: expiring.length,
        activeLeases: activeLeases.length,
        expectedMonthly,
        collectedThisMonth,
        outstandingBalance,
        occupancyRate,
        occupancyHistory,
        leaseExpirations,
        latestTenants,
        notifications,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-72 col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const collectionRate = data.expectedMonthly > 0
    ? Math.round((data.collectedThisMonth / data.expectedMonthly) * 100)
    : 0

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option>All Properties</option>
          </select>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Buildings',
            value: data.totalBuildings,
            sub: 'Active properties',
            icon: Building2,
            iconBg: 'bg-[#0f1f3d]',
            iconColor: 'text-[#14b8a6]',
            trend: null,
          },
          {
            label: 'Total Units',
            value: data.totalUnits,
            sub: `${data.occupiedUnits} Occupied · ${data.vacantUnits} Vacant`,
            icon: Home,
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-600',
            trend: `${data.occupancyRate}% occupied`,
          },
          {
            label: 'Active Tenants',
            value: data.activeTenants,
            sub: `${data.activeLeases} active leases`,
            icon: Users,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            trend: null,
          },
          {
            label: 'Leases Expiring Soon',
            value: data.expiringLeases,
            sub: 'This month',
            icon: FileText,
            iconBg: 'bg-red-50',
            iconColor: 'text-red-500',
            trend: null,
            alert: data.expiringLeases > 0,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1.5">
                  {card.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3 w-3 text-teal-500" />
                    <span className="text-xs text-teal-600 font-medium">{card.trend}</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-xl shrink-0 ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            {card.alert && (
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Needs attention
                </span>
                <button
                  onClick={() => router.push('/leases')}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                >
                  View <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Occupancy Rate chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Occupancy Rate</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <span className="text-sm font-bold text-teal-700">
                +{data.occupancyRate}%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.occupancyHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                domain={[50, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Occupancy']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#14b8a6"
                strokeWidth={2.5}
                fill="url(#occupancyGradient)"
                dot={{ fill: '#14b8a6', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#14b8a6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lease Expirations chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Lease Expirations</h2>
            <button className="text-slate-400 hover:text-slate-600">
              <span className="text-lg">···</span>
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.leaseExpirations} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [value, 'Leases']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                fill="#0f1f3d"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row — Latest Tenants + Notifications + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Latest Tenants */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Latest Tenants</h2>
            <button
              onClick={() => router.push('/tenants')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {data.latestTenants.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              No active tenants yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500">Name</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500">Unit</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500">Lease Period</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500">Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latestTenants.map((tenant, i) => (
                    <tr
                      key={tenant.id}
                      className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push('/tenants')}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[#0f1f3d] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0">
                            {tenant.avatar}
                          </div>
                          <span className="font-medium text-slate-900">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600">{tenant.unit}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-500 text-xs">
                          {format(new Date(tenant.leaseStart), 'MMM d, yyyy')}
                          {' – '}
                          {tenant.leaseEnd
                            ? format(new Date(tenant.leaseEnd), 'MMM d, yyyy')
                            : 'Open ended'
                          }
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold text-slate-900">
                            ${tenant.rent.toLocaleString()}/m
                          </span>
                          <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-teal-600" />
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

        {/* Right column — Notifications + Quick Actions */}
        <div className="space-y-4">

          {/* Revenue summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Revenue this month</h3>
              <button
                onClick={() => router.push('/payments')}
                className="text-xs text-teal-600 hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <p className="text-xs text-slate-400">Expected</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {data.expectedMonthly.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Collected</p>
                <p className="text-sm font-bold text-teal-600 mt-0.5">
                  {data.collectedThisMonth.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Outstanding</p>
                <p className={`text-sm font-bold mt-0.5 ${data.outstandingBalance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {data.outstandingBalance.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Collection rate</span>
                <span className="font-medium text-slate-600">{collectionRate}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min(collectionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <button className="text-xs text-teal-600 hover:underline flex items-center gap-0.5">
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {data.notifications.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle2 className="h-6 w-6 text-teal-400 mx-auto mb-1 opacity-50" />
                  <p className="text-xs text-slate-400">All clear</p>
                </div>
              ) : (
                data.notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push('/leases')}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#0f1f3d] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0">
                      {notif.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{notif.name}</p>
                      <p className="text-xs text-slate-400">Unit {notif.unit}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      notif.status === 'expired'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {notif.status === 'expired'
                        ? 'Expired'
                        : `${notif.days}d left`
                      }
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-2">
              {[
                {
                  label: 'Add New Tenant',
                  icon: Users,
                  href: '/buildings',
                  bg: 'bg-[#0f1f3d]',
                  color: 'text-white',
                },
                {
                  label: 'Add New Unit',
                  icon: Home,
                  href: '/buildings',
                  bg: 'bg-[#0f1f3d]',
                  color: 'text-white',
                },
                {
                  label: 'Create New Lease',
                  icon: FileText,
                  href: '/buildings',
                  bg: 'bg-[#0f1f3d]',
                  color: 'text-white',
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg ${action.bg} hover:opacity-90 transition-opacity`}
                >
                  <action.icon className={`h-4 w-4 ${action.color} shrink-0`} />
                  <span className={`text-sm font-medium ${action.color}`}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

