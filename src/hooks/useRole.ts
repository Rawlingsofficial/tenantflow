// src/hooks/useRole.ts
"use client";

import { useOrgStore } from "@/store/orgStore";
import type { Role } from "@/types";

/**
 * useRole hook
 * Returns the current user's role in the active organization.
 * Relies on OrganizationProvider for hydration.
 */
export function useRole(): { role: Role | null; loading: boolean } {
  const userRole = useOrgStore((s) => s.userRole);
  const currentOrg = useOrgStore((s) => s.currentOrg);

  // If we have an org but no role yet, we're likely still loading from OrganizationProvider
  const loading = !userRole && !!currentOrg;

  return { role: userRole, loading };
}
