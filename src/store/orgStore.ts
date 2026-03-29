// src/store/orgStore.ts
import { create } from 'zustand'
import type { Role } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PropertyType = 'residential' | 'commercial'

export interface OrgData {
  id: string
  name: string
  property_type: PropertyType | null
  country: string | null
  plan_type: string | null
}

interface OrgState {
  currentOrg: OrgData | null
  userRole: Role | null
  setCurrentOrg: (org: OrgData | null) => void
  setUserRole: (role: Role | null) => void
  /** @deprecated alias → setUserRole */
  setCurrentRole: (role: Role | null) => void
  /** @deprecated alias → userRole */
  currentRole: Role | null
  reset: () => void
}

// ── Store ──────────────────────────────────────────────────────────────────────
// NOTE: No getter syntax inside create() — it doesn't work with Zustand.
// currentRole is kept as a plain field that mirrors userRole via setCurrentRole.

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: null,
  userRole: null,
  currentRole: null, // kept for backward compat — always equals userRole

  setCurrentOrg: (org) => set({ currentOrg: org }),

  setUserRole: (role) =>
    set({ userRole: role, currentRole: role }), // keep both in sync

  setCurrentRole: (role) =>
    set({ userRole: role, currentRole: role }), // alias

  reset: () => set({ currentOrg: null, userRole: null, currentRole: null }),
}))
