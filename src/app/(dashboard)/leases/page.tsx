'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, FileText, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import LeasesTable from '@/components/leases/LeasesTable'
import LeaseDetailDialog from '@/components/leases/LeaseDetailDialog'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import { differenceInDays } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

type FilterTab = 'all' | 'active' | 'expiring_soon' | 'ended' | 'terminated'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null)
  const [detailDialog, setDetailDialog] = useState(false)
  const [newLeaseDialog, setNewLeaseDialog] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (orgId) loadLeases()
  }, [orgId])

  async function loadLeases() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`
        *,
        tenants ( id, first_name, last_name, email, primary_phone, photo_url ),
        units (
          id, unit_code, unit_type, bedrooms, bathrooms,
          default_rent, status, building_id,
          buildings ( id, name, address )
        ),
        rent_payments ( id, amount, payment_date, method, reference, status )
      `)
      .eq('organization_id', orgId!)
      .order('lease_start', { ascending: false })

    setLeases((data as LeaseWithDetails[]) ?? [])
    setLoading(false)
  }

  // Stats
  const activeLeases = leases.filter((l) => l.status === 'active')
  const expiringSoon = leases.filter((l) => {
    if (l.status !== 'active' || !l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), new Date()) <= 30
  })
  const totalRent = activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)
  const ended = leases.filter((l) => l.status === 'ended' || l.status === 'terminated')

  const filtered = leases.filter((l) => {
    const q = search.toLowerCase()
    const tenantName = `${(l as any).tenants?.first_name ?? ''} ${(l as any).tenants?.last_name ?? ''}`.toLowerCase()
    const unit = (l as any).units?.unit_code?.toLowerCase() ?? ''
    const building = (l as any).units?.buildings?.name?.toLowerCase() ?? ''
    const matchSearch = !q || tenantName.includes(q) || unit.includes(q) || building.includes(q)
    if (!matchSearch) return false
    if (filter === 'active') return l.status === 'active'
    if (filter === 'expiring_soon') return expiringSoon.some((e) => e.id === l.id)
    if (filter === 'ended') return l.status === 'ended'
    if (filter === 'terminated') return l.status === 'terminated'
    return true
  })

  const tabs: { label: string; value: FilterTab; count?: number; color?: string }[] = [
    { label: 'All', value: 'all', count: leases.length },
    { label: 'Active', value: 'active', count: activeLeases.length },
    { label: 'Expiring Soon', value: 'expiring_soon', count: expiringSoon.length, color: 'text-amber-600' },
    { label: 'Ended', value: 'ended', count: ended.length },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Leases</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeLeases.length} active · ${totalRent.toLocaleString()}/mo total rent
          </p>
        </div>
        <Button onClick={() => setNewLeaseDialog(true)}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 px-4">
          <Plus className="h-4 w-4" /> Create New Lease
        </Button>
      </div>

      {/* Stats cards */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Leases', value: leases.length, color: 'text-gray-800', icon: FileText },
          { label: 'Active', value: activeLeases.length, color: 'text-emerald-600', icon: TrendingUp },
          { label: 'Expiring Soon', value: expiringSoon.length, color: 'text-amber-600', icon: Clock },
          { label: 'Monthly Revenue', value: `$${totalRent.toLocaleString()}`, color: 'text-emerald-600', icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expiring soon alert */}
      {expiringSoon.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{expiringSoon.length} lease{expiringSoon.length > 1 ? 's' : ''}</span> expiring within 30 days
            </p>
            <button onClick={() => setFilter('expiring_soon')}
              className="ml-auto text-xs text-amber-700 font-medium underline">
              View all
            </button>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="px-6 flex items-center justify-between">
        <div className="flex items-center gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search leases..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="px-6">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <LeasesTable
              leases={filtered}
              onViewDetail={(lease) => { setSelectedLease(lease); setDetailDialog(true) }}
            />
          )}
        </div>
      </div>

      <LeaseDetailDialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        lease={selectedLease as any}
        organizationId={orgId ?? ''}
        onUpdated={loadLeases}
      />

      <AssignTenantDialog
        open={newLeaseDialog}
        onClose={() => setNewLeaseDialog(false)}
        onSaved={() => { setNewLeaseDialog(false); loadLeases() }}
        unit={null}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}

