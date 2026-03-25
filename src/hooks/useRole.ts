"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/store/orgStore";
import type { Role } from "@/types";

/**
 * Fetches the current user's role for the active org from Supabase
 * and keeps the global orgStore in sync.
 *
 * Returns { role, loading }.
 */
export function useRole() {
  const { userId, orgId } = useAuth();
  const supabase = createBrowserClient();

  const { currentRole, setCurrentRole, currentOrg, setCurrentOrg } = useOrgStore();
  const [loading, setLoading] = useState(!currentRole);

  useEffect(() => {
    if (!userId || !orgId) {
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    // Already populated for this org — skip fetch
    if (currentRole && currentOrg?.id === orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRole() {
      setLoading(true);
      try {
        // 1. Get user's Supabase UUID
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .single<{ id: string }>();

        if (!userData || cancelled) return;

        // 2. Get membership
        const { data: membership } = await supabase
          .from("organization_memberships")
          .select("role")
          .eq("user_id", userData.id)
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .single<{ role: Role }>();

        if (cancelled) return;

        if (membership) {
          setCurrentRole(membership.role);
        }

        // 3. Also hydrate org info if not set
        if (!currentOrg || currentOrg.id !== orgId) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("id, name, property_type")
            .eq("id", orgId!)
            .single<{ id: string; name: string; property_type?: string }>();

          if (orgData && !cancelled) {
            setCurrentOrg(orgData);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRole();
    return () => { cancelled = true; };
  }, [userId, orgId]);

  return { role: currentRole, loading };
}
