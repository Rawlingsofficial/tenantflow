'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import PortfolioReport from '@/components/reports/PortfolioReport'
import RevenueReport from '@/components/reports/RevenueReport'
import TenantReport from '@/components/reports/TenantReport'
import LeaseReport from '@/components/reports/LeaseReport'

export type ReportData = {
  // Portfolio
  totalBuildings: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  maintenanceUnits: number
  occupancyRate: number

  // Revenue
  activeLeases: {
    id: string
    rent_amount: number
    lease_start: string
    lease_end: string | null
    tenant_id: string
    unit_id: string
    tenants: { first_name: string | null; last_name: string | null } | null
    units: { unit_code: string; buildings: { name: string } | null } | null
    rent_payments: {
      id: string
      amount: number
      payment_date: string
      status: string
      method: string | null
    }[]
  }[]

  allPayments: {
    id: string
    amount: number
    payment_date: string
    status: string
    method: string | null
    lease_id: string
  }[]

  // Tenants
  tenants: {
    id: string
    first_name: string | null
    last_name: string | null
    status: string
    created_at?: string
    occupation: string | null
    leases: { status: string; lease_start: string; lease_end: string | null }[]
  }[]

  // Leases
  allLeases: {
    id: string
    status: string
    lease_start: string
    lease_end: string | null
    rent_amount: number
    tenants: { first_name: string | null; last_name: string | null } | null
    units: { unit_code: string; buildings: { name: string } | null } | null
  }[]
}

export default function ReportsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'revenue' | 'tenants' | 'leases'>('portfolio')

  useEffect(() => {
    if (orgId) loadReportData()
  }, [orgId])

  async function loadReportData() {
    setLoading(true)

    const [buildingsRes, unitsRes, leasesRes, tenantsRes, paymentsRes] = await Promise.all([
      supabase
        .from('buildings')
        .select('id, name, status')
        .eq('organization_id', orgId!)
        .eq('status', 'active'),

      supabase
        .from('units')
        .select('id, status, building_id')
        .in('building_id', []),

      supabase
        .from('leases')
        .select(`
          id, status, lease_start, lease_end, rent_amount, tenant_id, unit_id,
          tenants ( first_name, last_name ),
          units ( unit_code, buildings ( name ) ),
          rent_payments ( id, amount, payment_date, status, method )
        `)
        .eq('organization_id', orgId!),

      supabase
        .from('tenants')
        .select(`
          id, first_name, last_name, status, occupation,
          leases ( status, lease_start, lease_end )
        `)
        .eq('organization_id', orgId!),

      supabase
        .from('rent_payments')
        .select('id, amount, payment_date, status, method, lease_id')
        .order('payment_date', { ascending: false }),
    ])

    // Fetch units separately with building IDs
    const buildingIds = (buildingsRes.data ?? []).map((b) => b.id)
    const { data: unitsData } = await supabase
      .from('units')
      .select('id, status, building_id')
      .in('building_id', buildingIds.length > 0 ? buildingIds : ['none'])

    const units = unitsData ?? []
    const totalUnits = units.length
    const occupiedUnits = units.filter((u) => u.status === 'occupied').length
    const vacantUnits = units.filter((u) => u.status === 'vacant').length
    const maintenanceUnits = units.filter((u) => u.status === 'maintenance').length
    const occupancyRate = totalUnits > 0
      ? Math.round((occupiedUnits / totalUnits) * 100)
      : 0

    const activeLeases = (leasesRes.data ?? []).filter((l) => l.status === 'active')

    setData({
      totalBuildings: buildingsRes.data?.length ?? 0,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      maintenanceUnits,
      occupancyRate,
      activeLeases: activeLeases as any,
      allPayments: paymentsRes.data ?? [],
      tenants: tenantsRes.data as any ?? [],
      allLeases: leasesRes.data as any ?? [],
    })

    setLoading(false)
  }

  const tabs = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'leases', label: 'Leases' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">
          Analytics and insights for your property portfolio
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : data ? (
        <>
          {activeTab === 'portfolio' && <PortfolioReport data={data} />}
          {activeTab === 'revenue' && <RevenueReport data={data} />}
          {activeTab === 'tenants' && <TenantReport data={data} />}
          {activeTab === 'leases' && <LeaseReport data={data} />}
        </>
      ) : null}
    </div>
  )
}

