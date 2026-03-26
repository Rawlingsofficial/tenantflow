// src/hooks/useRole.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrgStore, type OrgData } from "@/store/orgStore";
import type { Role } from "@/types";

export function useRole(): { role: Role | null; loading: boolean } {
  const { userId, orgId, getToken } = useAuth();

  const setUserRole    = useOrgStore((s) => s.setUserRole);
  const setCurrentOrg  = useOrgStore((s) => s.setCurrentOrg);
  const userRole       = useOrgStore((s) => s.userRole);
  const currentOrg     = useOrgStore((s) => s.currentOrg);

  const [loading, setLoading]  = useState(true);
  const lastFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    // undefined = Clerk still initialising
    if (userId === undefined || orgId === undefined) return;

    // Clerk loaded but no session/org
    if (!userId || !orgId) {
      setUserRole(null);
      setLoading(false);
      lastFetchedRef.current = null;
      return;
    }

    const fetchKey = `${userId}:${orgId}`;

    // Already have valid data for this pair — skip
    if (
      lastFetchedRef.current === fetchKey &&
      userRole !== null &&
      currentOrg?.id === orgId
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRole() {
      setLoading(true);
      try {
        // Get Clerk JWT so Supabase RLS can authenticate the request.
        // Without this, the anon key hits RLS policies and returns no rows,
        // making useRole think the user doesn't exist.
        const token = await getToken({ template: "supabase" });
        const supabase = getSupabaseBrowserClient(token ?? undefined);

        // 1. Resolve Supabase UUID from Clerk user id
        const { data: userData, error: userError } = await (supabase as any)
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .maybeSingle();

        if (cancelled) return;

        if (userError || !userData) {
          console.error("[useRole] No supabase user for clerk_user_id:", userId, userError);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // 2. Fetch membership role
        const { data: memberData, error: memberError } = await (supabase as any)
          .from("organization_memberships")
          .select("role")
          .eq("user_id", userData.id)
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .maybeSingle();

        if (cancelled) return;

        if (memberError || !memberData?.role) {
          console.error("[useRole] No active membership:", {
            supabase_user_id: userData.id,
            org_id: orgId,
            memberError,
            memberData,
          });
          setUserRole(null);
          setLoading(false);
          return;
        }

        console.log("[useRole] Role resolved:", memberData.role);
        setUserRole(memberData.role as Role);

        // 3. Hydrate org if not already loaded for this org
        if (!currentOrg || currentOrg.id !== orgId) {
          const { data: orgData, error: orgError } = await (supabase as any)
            .from("organizations")
            .select("id, name, property_type, country, plan_type")
            .eq("id", orgId!)
            .maybeSingle();

          if (orgError) console.error("[useRole] Org fetch error:", orgError);

          if (orgData && !cancelled) {
            setCurrentOrg({
              id: orgData.id,
              name: orgData.name,
              property_type: orgData.property_type ?? null,
              country: orgData.country ?? null,
              plan_type: orgData.plan_type ?? null,
            } as OrgData);
          }
        }

        if (!cancelled) {
          lastFetchedRef.current = fetchKey;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useRole] Unexpected error:", err);
          setUserRole(null);
          setLoading(false);
        }
      }
    }

    fetchRole();
    return () => { cancelled = true; };
  }, [userId, orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { role: userRole, loading };
}
