import { create } from 'zustand'
import type { Role } from '@/types'

export type PropertyType = 'residential' | 'commercial' | 'mixed' | null

export interface OrgData {
  id: string
  name: string
  property_type: PropertyType
  country: string | null
  plan_type: string | null
}

interface OrgState {
  currentOrg: OrgData | null
  userRole: Role | null
  // legacy alias kept for backward-compat with any code that uses currentRole
  get currentRole(): Role | null
  setCurrentOrg: (org: OrgData) => void
  setUserRole: (role: Role | null) => void
  /** @deprecated use setUserRole */
  setCurrentRole: (role: Role | null) => void
  reset: () => void
}

export const useOrgStore = create<OrgState>((set, get) => ({
  currentOrg: null,
  userRole: null,
  get currentRole() {
    return get().userRole
  },
  setCurrentOrg: (org) => set({ currentOrg: org }),
  setUserRole: (role) => set({ userRole: role }),
  setCurrentRole: (role) => set({ userRole: role }),
  reset: () => set({ currentOrg: null, userRole: null }),
}))
