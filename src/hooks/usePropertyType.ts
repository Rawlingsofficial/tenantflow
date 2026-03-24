'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useOrgStore, type PropertyType, type OrgData } from '@/store/orgStore'

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

    supabase
      .from('organizations')
      .select('id, name, property_type, country, plan_type')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const org: OrgData = {
          id: data.id,
          name: data.name,
          property_type: (data.property_type as PropertyType) ?? 'residential',
          country: data.country ?? null,
          plan_type: data.plan_type ?? null,
        }
        setCurrentOrg(org)
      })

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
    }
  }, [orgId, userId])

  return {
    propertyType: currentOrg?.property_type ?? null,
    loading,
  }
}
