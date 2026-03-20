'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { isSameMonth } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import StatsCards from '@/components/dashboard/StatsCards'
import OccupancyChart from '@/components/dashboard/OccupancyChart'
import QuickActions from '@/components/dashboard/QuickActions'
import NotificationsPanel from '@/components/dashboard/NotificationsPanel'
import RevenueCard from '@/components/dashboard/RevenueCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardStats, LeaseWithDetails } from '@/types'

export default function DashboardPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [expiringLeases, setExpiringLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    loadDashboard()
  }, [orgId])

  async function loadDashboard() {
    setLoading(true)
    try {
      // Buildings
      const { data: buildings } = await supabase
        .from('buildings')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('status', 'active')

      const buildingIds: string[] = (buildings ?? []).map(
        (b: { id: string }) => b.id
      )

      // Units
      const { data: units } = await supabase
        .from('units')
        .select('id, status, building_id')
        .in('building_id', buildingIds.length > 0 ? buildingIds : ['none'])

      const totalUnits = units?.length ?? 0
      const vacantUnits =
        units?.filter((u: { status: string }) => u.status === 'vacant').length ?? 0
      const occupiedUnits =
        units?.filter((u: { status: string }) => u.status === 'occupied').length ?? 0

      // Tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('status', 'active')

      // Active leases
      const { data: activeLeases } = await supabase
        .from('leases')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('status', 'active')

      // Expiring leases this month
      const now = new Date()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]
      const today = now.toISOString().split('T')[0]

      const { data: expiring } = await supabase
        .from('leases')
        .select(`
          *,
          tenants (id, first_name, last_name, email, primary_phone),
          units (
            id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id,
            buildings (id, name, address)
          )
        `)
        .eq('organization_id', orgId!)
        .eq('status', 'active')
        .gte('lease_end', today)
        .lte('lease_end', endOfMonth)

      // Revenue stats
      const { data: leasesWithPayments } = await supabase
        .from('leases')
        .select(`
          id, rent_amount,
          rent_payments ( amount, payment_date, status )
        `)
        .eq('organization_id', orgId!)
        .eq('status', 'active')

      const expectedMonthly = (leasesWithPayments ?? []).reduce(
        (sum: number, l: any) => sum + Number(l.rent_amount),
        0
      )

      const collectedThisMonth = (leasesWithPayments ?? []).reduce(
        (sum: number, l: any) => {
          const paid = (l.rent_payments ?? [])
            .filter(
              (p: any) =>
                p.status === 'completed' &&
                isSameMonth(new Date(p.payment_date), now)
            )
            .reduce((s: number, p: any) => s + Number(p.amount), 0)
          return sum + paid
        },
        0
      )

      const outstandingBalance = Math.max(0, expectedMonthly - collectedThisMonth)

      setStats({
        totalBuildings: (buildings ?? []).length,
        totalUnits,
        vacantUnits,
        occupiedUnits,
        activeTenants: (tenants ?? []).length,
        activeLeases: (activeLeases ?? []).length,
        expiringLeases: (expiring ?? []).length,
        expectedMonthly,
        collectedThisMonth,
        outstandingBalance,
      })

      setExpiringLeases((expiring as LeaseWithDetails[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Here's what's happening with your properties today.
        </p>
      </div>

      {/* Stats cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Charts + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <OccupancyChart
            occupied={stats?.occupiedUnits ?? 0}
            vacant={stats?.vacantUnits ?? 0}
          />
          <RevenueCard
            expectedMonthly={stats?.expectedMonthly ?? 0}
            collectedThisMonth={stats?.collectedThisMonth ?? 0}
            outstandingBalance={stats?.outstandingBalance ?? 0}
          />
        </div>
        <QuickActions />
      </div>

      {/* Notifications */}
      <NotificationsPanel
        expiringLeases={expiringLeases}
        vacantUnits={stats?.vacantUnits ?? 0}
      />
    </div>
  )
}

