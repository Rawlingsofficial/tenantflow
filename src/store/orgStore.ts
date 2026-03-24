import { create } from 'zustand'

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
  userRole: 'owner' | 'admin' | 'manager' | 'viewer' | null
  setCurrentOrg: (org: OrgData) => void
  setUserRole: (role: 'owner' | 'admin' | 'manager' | 'viewer') => void
  reset: () => void
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: null,
  userRole: null,
  setCurrentOrg: (org) => set({ currentOrg: org }),
  setUserRole: (role) => set({ userRole: role }),
  reset: () => set({ currentOrg: null, userRole: null }),
}))
