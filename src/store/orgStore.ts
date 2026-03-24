import { create } from 'zustand'

export type PropertyType = 'residential' | 'commercial' | 'mixed' | null

interface OrgData {
  id: string
  name: string
  property_type: PropertyType
  country: string | null
  plan_type: string | null
}

interface OrgState {
  // org data
  currentOrg: OrgData | null
  // user role in this org
  userRole: 'owner' | 'admin' | 'manager' | 'viewer' | null

  // actions
  setCurrentOrg: (org: OrgData) => void
  setUserRole: (role: OrgState['userRole']) => void
  reset: () => void

  // convenience getters (derived)
  propertyType: PropertyType
}

export const useOrgStore = create<OrgState>((set, get) => ({
  currentOrg: null,
  userRole: null,

  setCurrentOrg: (org) => set({ currentOrg: org }),
  setUserRole: (role) => set({ userRole: role }),
  reset: () => set({ currentOrg: null, userRole: null }),

  get propertyType() {
    return get().currentOrg?.property_type ?? null
  },
}))
