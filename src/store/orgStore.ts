import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Organization, Role } from '@/types'

interface OrgState {
  currentOrg: Organization | null
  currentRole: Role | null
  setCurrentOrg: (org: Organization) => void
  setCurrentRole: (role: Role) => void
  clearOrg: () => void
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      currentOrg: null,
      currentRole: null,
      setCurrentOrg: (org) => set({ currentOrg: org }),
      setCurrentRole: (role) => set({ currentRole: role }),
      clearOrg: () => set({ currentOrg: null, currentRole: null }),
    }),
    {
      name: 'tenantflow-org',
    }
  )
)


