import { create } from 'zustand'

interface OrgState {
  currentOrg: { id: string; name: string; property_type?: string } | null
  setCurrentOrg: (org: { id: string; name: string; property_type?: string } | null) => void
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: null,
  setCurrentOrg: (org) => set({ currentOrg: org }),
}))
