import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useOrgStore } from '@/store/orgStore'
import type { Role } from '@/types'

export function useOrg() {
  const { userId, orgId } = useAuth()
  const { currentOrg, currentRole, setCurrentOrg, setCurrentRole } = useOrgStore()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    if (!userId || !orgId) return

    const orgIdValue = orgId // capture as const so TS knows it's string inside async

    async function loadOrg() {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgIdValue)
        .single()

      if (org) setCurrentOrg(org)

      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', orgIdValue)
        .eq('user_id', userId as string)
        .returns<{ role: Role }[]>()
        .single()

      if (membership) setCurrentRole(membership.role)
    }

    loadOrg()
  }, [userId, orgId])

  return { currentOrg, currentRole }
}