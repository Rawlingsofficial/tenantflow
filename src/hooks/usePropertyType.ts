'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type PropertyType = 'residential' | 'commercial' | 'mixed'

// Module-level cache: orgId → type
const cache: Record<string, PropertyType> = {}

export function usePropertyType() {
  const { organization } = useOrganization()
  const orgId = organization?.id
  const [type, setType] = useState<PropertyType>('residential')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    // Return from cache immediately if available
    if (cache[orgId]) {
      setType(cache[orgId])
      setLoading(false)
      return
    }
    const supabase = getSupabaseBrowserClient()
    supabase
      .from('organizations')
      .select('property_type')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        const t = (data?.property_type as PropertyType) ?? 'residential'
        cache[orgId] = t
        setType(t)
        setLoading(false)
      })
  }, [orgId])

  // Call after updating property_type to bust cache
  function invalidate() {
    if (orgId) delete cache[orgId]
  }

  const isResidential = type === 'residential'
  const isCommercial = type === 'commercial'
  const isMixed = type === 'mixed'

  // Adaptive labels — use these everywhere instead of hardcoding
  const labels = {
    tenants: isCommercial ? 'Companies' : isMixed ? 'Tenants & Companies' : 'Tenants',
    tenant: isCommercial ? 'Company' : 'Tenant',
    addTenant: isCommercial ? 'Add Company' : isMixed ? 'Add Tenant / Company' : 'Add Tenant',
    units: isCommercial ? 'Spaces' : 'Units',
    unit: isCommercial ? 'Space' : 'Unit',
    payments: isCommercial ? 'Invoices' : 'Payments',
    unitType: isCommercial ? 'Space Type' : 'Unit Type',
    vacant: isCommercial ? 'Available' : 'Vacant',
  }

  return { type, loading, isResidential, isCommercial, isMixed, labels, invalidate }
}


