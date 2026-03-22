import { create } from 'zustand'
import type { Role } from '@/types'

interface OrgState {
  currentOrg: { id: string; name: string; property_type?: string } | null
  currentRole: Role | null
  setCurrentOrg: (org: { id: string; name: string; property_type?: string } | null) => void
  setCurrentRole: (role: Role | null) => void
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: null,
  currentRole: null,
  setCurrentOrg: (org) => set({ currentOrg: org }),
  setCurrentRole: (role) => set({ currentRole: role }),
}))


//for backward compatibility with useRole