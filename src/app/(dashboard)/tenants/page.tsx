'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import TenantsTable from '@/components/tenants/TenantsTable'
import type { Tenant } from '@/types'

interface TenantWithUnit extends Tenant {
  leases?: {
    units?: {
      unit_code: string
      buildings?: { name: string } | null
    } | null
    status: string
  }[]
}

export default function TenantsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [tenants, setTenants] = useState<TenantWithUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) loadTenants()
  }, [orgId])

  async function loadTenants() {
    setLoading(true)
    const { data } = await supabase
      .from('tenants')
      .select(`
        *,
        leases (
          status,
          units (
            unit_code,
            buildings ( name )
          )
        )
      `)
      .eq('organization_id', orgId!)
      .order('first_name')

    setTenants((data as TenantWithUnit[]) ?? [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
        <p className="text-slate-500 text-sm mt-1">
          {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} · assign tenants from the{' '}
          <a href="/buildings" className="text-indigo-600 hover:underline">Buildings</a> page
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <TenantsTable tenants={tenants} />
      )}
    </div>
  )
}