'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useOrgStore, type PropertyType } from '@/store/orgStore'

/**
 * Resolves the current organization's property_type and populates orgStore.
 * Also fetches the current user's role in the org.
 *
 * Returns { propertyType, loading } — stable API used across the app.
 */
export function usePropertyType(): { propertyType: PropertyType; loading: boolean } {
  const { orgId, userId } = useAuth()
  const { currentOrg, setCurrentOrg, setUserRole } = useOrgStore()

  const loading = !currentOrg && !!orgId

  useEffect(() => {
    if (!orgId) return
    if (currentOrg?.id === orgId) return  // already loaded for this org

    const supabase = getSupabaseBrowserClient()

    // Load org data
    supabase
      .from('organizations')
      .select('id, name, property_type, country, plan_type')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setCurrentOrg({
          id: data.id,
          name: data.name,
          property_type: (data.property_type as PropertyType) ?? 'residential',
          country: data.country ?? null,
          plan_type: data.plan_type ?? null,
        })
      })

    // Load user role
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
                setUserRole(membership.role as any)
              }
            })
        })
    }
  }, [orgId, userId])

  return {
    propertyType: currentOrg?.property_type ?? null,
    loading,
  }
}
