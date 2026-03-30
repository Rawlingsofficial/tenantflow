'use client'

import { useEffect, useState } from 'react'
import { useUser, useOrganization } from '@clerk/nextjs'
import { useOrgStore } from '@/store/orgStore'
// ← REMOVED: import { createServerClient } from '@/lib/supabase/server'  (server-only, crashes here)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentOrg, setCurrentRole } = useOrgStore()
  const { user, isLoaded: userLoaded } = useUser()
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userLoaded || !orgLoaded) return

    if (!user || !organization) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 5

    const fetchOrg = async () => {
      attempts++
      try {
        const res = await fetch('/api/org-context')
        if (!res.ok) throw new Error(`API returned ${res.status}`)

        const data = await res.json()
        if (cancelled) return

        if (data.org && data.role) {
          setCurrentOrg(data.org)
          setCurrentRole(data.role)
          setIsLoading(false)
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(fetchOrg, 1000)
        } else {
          console.warn('[Provider] Falling back to Clerk org data after max retries')
          setCurrentOrg({
            id: organization.id,
            name: organization.name ?? 'My Organization',
            property_type: null,   // ← FIX: was `undefined`, must be null to match OrgData type
            country: null,
            plan_type: null,
          })
          setCurrentRole('owner')
          setIsLoading(false)
        }
      } catch (err) {
        console.error('[Provider] fetch error:', err)
        if (!cancelled && attempts < maxAttempts) {
          setTimeout(fetchOrg, 1000)
        } else if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchOrg()
    return () => { cancelled = true }
  }, [userLoaded, orgLoaded, user, organization, setCurrentOrg, setCurrentRole])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-sm">Loading organization...</p>
      </div>
    )
  }

  return <>{children}</>
}

