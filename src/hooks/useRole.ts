"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
  const supabase = getSupabaseBrowserClient();

  const currentOrg  = useOrgStore((s) => s.currentOrg);
  const userRole    = useOrgStore((s) => s.userRole);
  const setUserRole = useOrgStore((s) => s.setUserRole);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);

  const [loading, setLoading] = useState(!userRole);

  useEffect(() => {
    if (!userId || !orgId) {
      setUserRole(null);        // ✅ now allowed
      setLoading(false);
      return;
    }

    // Already populated for this org — skip fetch
    if (userRole && currentOrg?.id === orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRole() {
      setLoading(true);
      try {
        // 1. Get user's Supabase UUID
        const userResult = await (supabase as any)
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .single() as { data: { id: string } | null; error: any };

        if (!userResult.data || cancelled) return;

        // 2. Get membership role
        const memberResult = await (supabase as any)
          .from("organization_memberships")
          .select("role")
          .eq("user_id", userResult.data.id)
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .single() as { data: { role: Role } | null; error: any };

        if (cancelled) return;

        if (memberResult.data) {
          setUserRole(memberResult.data.role); // ✅ role is never null here
        }

        // 3. Hydrate org info if not set
        if (!currentOrg || currentOrg.id !== orgId) {
          const orgResult = await (supabase as any)
            .from("organizations")
            .select("id, name, property_type, country, plan_type")
            .eq("id", orgId!)
            .single() as {
              data: { id: string; name: string; property_type: string | null; country: string | null; plan_type: string | null } | null;
              error: any;
            };

          if (orgResult.data && !cancelled) {
            setCurrentOrg({
              id: orgResult.data.id,
              name: orgResult.data.name,
              property_type: (orgResult.data.property_type ?? "residential") as any,
              country: orgResult.data.country,
              plan_type: orgResult.data.plan_type,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRole();
    return () => { cancelled = true; };
  }, [userId, orgId]);

  return { role: userRole, loading };
}