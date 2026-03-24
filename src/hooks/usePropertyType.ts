'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useOrgStore, type PropertyType, type OrgData } from '@/store/orgStore'

// Define the shape of the organization row returned from Supabase
interface OrgRow {
  id: string
  name: string
  property_type: string
  country: string | null
  plan_type: string | null
}

export function usePropertyType(): { propertyType: PropertyType; loading: boolean } {
  const { orgId, userId } = useAuth()
  const currentOrg = useOrgStore((s) => s.currentOrg)
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg)
  const setUserRole = useOrgStore((s) => s.setUserRole)

  const loading = !currentOrg && !!orgId

  useEffect(() => {
    if (!orgId) return
    if (currentOrg?.id === orgId) return // already loaded

    const supabase = getSupabaseBrowserClient()

    // Fetch organization details
    supabase
      .from('organizations')
      .select('id, name, property_type, country, plan_type')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        if (!data) return
        // Cast the data to the expected shape
        const row = data as OrgRow
        const org: OrgData = {
          id: row.id,
          name: row.name,
          property_type: (row.property_type as PropertyType) ?? 'residential',
          country: row.country ?? null,
          plan_type: row.plan_type ?? null,
        }
        setCurrentOrg(org)
      })
      .catch((error) => {
        console.error('Error loading organization:', error)
      })

    // Fetch user role
    if (userId) {
      supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()
        .then(({ data: userData }) => {
          if (!userData) return
          supabase
            .from('organization_memberships')
            .select('role')
            .eq('organization_id', orgId)
            .eq('user_id', userData.id)
            .single()
            .then(({ data: membership }) => {
              if (membership?.role) {
                setUserRole(membership.role as 'owner' | 'admin' | 'manager' | 'viewer')
              }
            })
        })
        .catch((error) => {
          console.error('Error loading user or membership:', error)
        })
    }
  }, [orgId, userId, currentOrg?.id, setCurrentOrg, setUserRole])

  return {
    propertyType: currentOrg?.property_type ?? null,
    loading,
  }
}

