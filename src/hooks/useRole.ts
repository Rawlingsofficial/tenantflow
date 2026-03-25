"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrgStore, type OrgData } from "@/store/orgStore";
import type { Role } from "@/types";

export function useRole(): { role: Role | null; loading: boolean } {
  const { userId, orgId } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const currentOrg = useOrgStore((s) => s.currentOrg);
  const userRole = useOrgStore((s) => s.userRole);
  const setUserRole = useOrgStore((s) => s.setUserRole);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !orgId) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    // Already loaded for this org — skip
    if (userRole && currentOrg?.id === orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRole() {
      setLoading(true);
      try {
        // 1. Resolve Supabase UUID from Clerk user id
        const { data: userData, error: userError } = await (supabase as any)
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .single();

        if (userError || !userData) {
          console.warn("[useRole] user not found in supabase for clerk_user_id:", userId);
          if (!cancelled) setUserRole(null);
          return;
        }

        const supabaseUserId: string = userData.id;

        // 2. Fetch membership
        const { data: memberData, error: memberError } = await (supabase as any)
          .from("organization_memberships")
          .select("role")
          .eq("user_id", supabaseUserId)
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .single();

        if (memberError || !memberData?.role) {
          console.warn("[useRole] no active membership found");
          if (!cancelled) setUserRole(null);
        } else {
          if (!cancelled) setUserRole(memberData.role as Role);
        }

        // 3. Hydrate org if not already set
        if (!currentOrg || currentOrg.id !== orgId) {
          const { data: orgData } = await (supabase as any)
            .from("organizations")
            .select("id, name, property_type, country, plan_type")
            .eq("id", orgId!)
            .single();

          if (orgData && !cancelled) {
            setCurrentOrg({
              id: orgData.id,
              name: orgData.name,
              property_type: orgData.property_type ?? "residential",
              country: orgData.country ?? null,
              plan_type: orgData.plan_type ?? null,
            } as OrgData);
          }
        }
      } catch (err) {
        console.error("[useRole] unexpected error:", err);
        if (!cancelled) setUserRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRole();
    return () => { cancelled = true; };
  }, [userId, orgId]); // intentionally minimal — avoids infinite loops

  return { role: userRole, loading };
}
