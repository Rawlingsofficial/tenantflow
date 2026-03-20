'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import LeasesTable from '@/components/leases/LeasesTable'
import LeaseDetailDialog from '@/components/leases/LeaseDetailDialog'
import type { LeaseWithDetails } from '@/types'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null)
  const [detailDialog, setDetailDialog] = useState(false)

  useEffect(() => {
    if (orgId) loadLeases()
  }, [orgId])

  async function loadLeases() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`
        *,
        tenants ( id, first_name, last_name, email, primary_phone ),
        units (
          id, unit_code, unit_type, bedrooms, bathrooms,
          default_rent, status, building_id,
          buildings ( id, name, address )
        )
      `)
      .eq('organization_id', orgId!)
      .order('lease_start', { ascending: false })

    setLeases((data as LeaseWithDetails[]) ?? [])
    setLoading(false)
  }

  // Stats
  const activeCount = leases.filter((l) => l.status === 'active').length
  const totalRent = leases
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + Number(l.rent_amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leases</h1>
        <p className="text-slate-500 text-sm mt-1">
          {activeCount} active lease{activeCount !== 1 ? 's' : ''} ·{' '}
          <span className="font-medium text-slate-700">
            {totalRent.toLocaleString()}
          </span>{' '}
          total monthly rent
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <LeasesTable
          leases={leases}
          onViewDetail={(lease) => {
            setSelectedLease(lease)
            setDetailDialog(true)
          }}
        />
      )}

      <LeaseDetailDialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        lease={selectedLease}
        organizationId={orgId ?? ''}
        onUpdated={loadLeases}
      />
    </div>
  )
}

